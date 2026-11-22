import axios from 'axios'
import { JSDOM } from 'jsdom'
import { saveTokenToDb, getSupplierCredentials, applyMojibakeFix, type LoginResult } from './_base'
import { logger } from '../helpers/logger'
import { prisma } from '../../lib/db/prisma'

/**
 * Her tedarikçi için kendi login senaryosu — hepsi axios tabanlı (puppeteer yok).
 */

// ============================================================
// Generic axios-based login (Civaner / ABM / Catpower aynı CMS)
// ============================================================
/**
 * Aynı altyapıyı kullanan tedarikçiler için ortak login akışı:
 * - POST <loginUrl> with adi/Sifre/SmsSifre
 * - Response JSON: { success, token, returnurl }
 * - Cookie format: "nlogin=oid=<token>"
 * Puppeteer 30-60sn yerine 1-3sn'de tamamlanır.
 */
async function axiosLogin(supplierName: string, loginUrl: string): Promise<LoginResult> {
  const start = Date.now()
  logger.info(`[token-refresher] ${supplierName} login başlatılıyor (axios)...`)

  const creds = await getSupplierCredentials(supplierName)
  if (!creds || !creds.username || !creds.password) {
    return { success: false, error: 'Eksik credentials (username/password)', durationMs: Date.now() - start }
  }

  try {
    const formBody = new URLSearchParams({
      adi: creds.username,
      Sifre: creds.password,
      SmsSifre: '',
    }).toString()

    const res = await axios.post(loginUrl, formBody, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 15000,
    })

    if (res.status !== 200 || !res.data?.success) {
      return {
        success: false,
        error: `Login başarısız: status=${res.status} body=${JSON.stringify(res.data).slice(0, 200)}`,
        durationMs: Date.now() - start,
      }
    }

    const oid = res.data.token
    if (!oid) {
      return { success: false, error: 'Token JSON\'da yok', durationMs: Date.now() - start }
    }

    const cookieToken = `nlogin=oid=${oid}`
    await saveTokenToDb(supplierName, cookieToken)

    return { success: true, token: cookieToken, durationMs: Date.now() - start }
  } catch (err: any) {
    return { success: false, error: err.message || 'Bilinmeyen hata', durationMs: Date.now() - start }
  }
}

// ============================================================
// CIVANER (axios login + döviz kuru)
// ============================================================
export async function refreshCivaner(): Promise<LoginResult> {
  const result = await axiosLogin('Civaner', 'https://b4b.civaner.com/Giris')

  if (result.success && result.token) {
    try {
      await fetchCivanerCurrencyRates(result.token)
    } catch (err: any) {
      logger.warn(`[Civaner] Kur güncelleme hatası: ${err.message}`)
    }
  }

  return result
}

/**
 * Civaner B2B ana sayfasından EUR ve USD kurlarını çekip DB'yi günceller.
 * Eski projedeki getCivanerDovizData() port'u.
 */
async function fetchCivanerCurrencyRates(token: string): Promise<void> {
  const response = await axios.get('https://b4b.civaner.com/', {
    headers: { Cookie: token },
    timeout: 30000,
  })

  const dom = new JSDOM(response.data)
  const items = dom.window.document.querySelectorAll('.Doviz-Bar')

  let euroKur: number | null = null
  let dolarKur: number | null = null

  items.forEach((item: any) => {
    const spans = item.querySelectorAll('span')
    if (spans.length < 2) return
    const dovizAdi = spans[0].textContent?.trim()
    const dovizDeger = spans[1].textContent?.trim() || ''
    const parsed = parseFloat(dovizDeger.replace(/\./g, '').replace(',', '.'))
    if (isNaN(parsed) || parsed <= 0) return
    if (dovizAdi === 'EUR') euroKur = parsed
    if (dovizAdi === 'USD') dolarKur = parsed
  })

  if (euroKur === null && dolarKur === null) {
    logger.warn(`[Civaner] .Doviz-Bar bulunamadı veya parse edilemedi`)
    return
  }

  await prisma.supplier.updateMany({
    where: { name: 'Civaner' },
    data: {
      ...(euroKur !== null ? { euro_kur: euroKur } : {}),
      ...(dolarKur !== null ? { dolar_kur: dolarKur } : {}),
    },
  })

  logger.info(`[Civaner] Kur güncellendi → EUR: ${euroKur}, USD: ${dolarKur}`)
}

// ============================================================
// ABM HIRDAVAT (axios — Civaner ile aynı CMS)
// ============================================================
export async function refreshAbmHirdavat(): Promise<LoginResult> {
  return axiosLogin('AbmHirdavat', 'https://b2b.abmhirdavat.com.tr/Giris')
}

// ============================================================
// AKİNZİRAAT (axios — Angular SPA, Mapas ile aynı CMS)
// ============================================================
export async function refreshAkinziraat(): Promise<LoginResult> {
  return axiosAngularLogin('Akinziraat', 'https://b4b.akinziraat.com', 'empty')
}

// ============================================================
// CATPOWER (axios — Civaner ile aynı CMS)
// ============================================================
export async function refreshCatpower(): Promise<LoginResult> {
  return axiosLogin('Catpower', 'https://bayi.catpower.com.tr/Giris')
}

// ============================================================
// Generic Angular SPA login (Mapas / Akinziraat aynı CMS)
// ============================================================
/**
 * Angular SPA pattern: GET /Login (pre-session cookie) → POST /Login/Index (JSON model)
 * Response: { Redirect: true, Link: "/Home" } + Set-Cookie ile session cookie'leri
 *
 * customerCodeMode:
 *   - 'same'  : CustomerCode = UserCode = username (Mapas)
 *   - 'empty' : CustomerCode = '', UserCode = username (Akinziraat)
 */
async function axiosAngularLogin(
  supplierName: string,
  baseUrl: string,
  customerCodeMode: 'same' | 'empty' = 'same',
): Promise<LoginResult> {
  const start = Date.now()
  logger.info(`[token-refresher] ${supplierName} login başlatılıyor (axios)...`)

  const creds = await getSupplierCredentials(supplierName)
  if (!creds || !creds.username || !creds.password) {
    return { success: false, error: 'Eksik credentials', durationMs: Date.now() - start }
  }

  try {
    // 1) Pre-session cookie al
    const pre = await axios.get(`${baseUrl}/Login`, {
      validateStatus: () => true, maxRedirects: 0, timeout: 10000,
    })
    const preCookies = (pre.headers['set-cookie'] || [])
      .map((c: string) => c.split(';')[0])
      .join('; ')

    // 2) JSON login
    const loginRes = await axios.post(`${baseUrl}/Login/Index`, {
      model: {
        CustomerCode: customerCodeMode === 'same' ? creds.username : '',
        UserCode: creds.username,
        Password: creds.password,
        LanguageId: '1',
        Captcha: '',
        NewPassword: '',
        NewPasswordRepeat: '',
        ChangePassword: false,
      },
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': baseUrl,
        'Referer': `${baseUrl}/Login`,
        'X-Requested-With': 'XMLHttpRequest',
        ...(preCookies ? { 'Cookie': preCookies } : {}),
      },
      maxRedirects: 0, validateStatus: () => true, timeout: 15000,
    })

    if (loginRes.status !== 200 || !loginRes.data?.Redirect) {
      return {
        success: false,
        error: `Login başarısız: status=${loginRes.status} body=${JSON.stringify(loginRes.data).slice(0, 200)}`,
        durationMs: Date.now() - start,
      }
    }

    // 3) Cookie'leri birleştir + Türkçe karakter mojibake fix (cookie isimlerinde İ vb.)
    const newCookies = (loginRes.headers['set-cookie'] || [])
      .map((c: string) => c.split(';')[0])
    const allCookies = applyMojibakeFix(
      [preCookies, ...newCookies].filter(Boolean).join('; ')
    )

    await saveTokenToDb(supplierName, allCookies)
    return { success: true, token: allCookies, durationMs: Date.now() - start }
  } catch (err: any) {
    return { success: false, error: err.message || 'Bilinmeyen hata', durationMs: Date.now() - start }
  }
}

// ============================================================
// MAPAS (axios — Angular SPA)
// ============================================================
export async function refreshMapas(): Promise<LoginResult> {
  return axiosAngularLogin('Mapas', 'https://b4b.mapas.com.tr', 'same')
}

// ============================================================
// İTAL (axios — ASP.NET MVC + anti-forgery token)
// ============================================================
/**
 * Ital login akışı:
 *   1) GET / → HTML'den __RequestVerificationToken (CSRF) + initial session cookie
 *   2) POST / form-urlencoded with CSRF + group1=CustomerLoginId + UserCode/Password
 *   3) Response 302 → /Home + Set-Cookie ile auth cookie'leri
 */
export async function refreshItal(): Promise<LoginResult> {
  const start = Date.now()
  logger.info(`[token-refresher] Ital login başlatılıyor (axios)...`)

  const creds = await getSupplierCredentials('Ital')
  if (!creds || !creds.username || !creds.password) {
    return { success: false, error: 'Eksik credentials', durationMs: Date.now() - start }
  }

  const baseUrl = 'https://b4b.italmakina.com.tr'

  try {
    // 1) GET / → CSRF + pre-cookie
    const pre = await axios.get(`${baseUrl}/`, {
      validateStatus: () => true, maxRedirects: 0, timeout: 10000,
    })
    const preCookies = (pre.headers['set-cookie'] || [])
      .map((c: string) => c.split(';')[0])
      .join('; ')
    const html = typeof pre.data === 'string' ? pre.data : ''
    const csrfMatch = html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/)
    const csrf = csrfMatch?.[1]
    if (!csrf) {
      return { success: false, error: 'CSRF (__RequestVerificationToken) bulunamadı', durationMs: Date.now() - start }
    }

    // 2) POST form
    const formBody = new URLSearchParams({
      __RequestVerificationToken: csrf,
      group1: 'CustomerLoginId',
      CustomerCode: '',
      UserCode: creds.username,
      Password: creds.password,
    }).toString()

    const res = await axios.post(`${baseUrl}/`, formBody, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': baseUrl,
        'Referer': `${baseUrl}/`,
        ...(preCookies ? { 'Cookie': preCookies } : {}),
      },
      maxRedirects: 0, validateStatus: () => true, timeout: 15000,
    })

    // Login başarılıysa 302 + location=/Home (Unauthorized değil)
    const location = res.headers.location || ''
    if (res.status !== 302 || location.includes('Unauthorized') || location.includes('Login')) {
      return {
        success: false,
        error: `Login başarısız: status=${res.status} location=${location}`,
        durationMs: Date.now() - start,
      }
    }

    // 3) Cookie'leri birleştir
    const newCookies = (res.headers['set-cookie'] || [])
      .map((c: string) => c.split(';')[0])
    const allCookies = applyMojibakeFix(
      [preCookies, ...newCookies].filter(Boolean).join('; ')
    )

    await saveTokenToDb('Ital', allCookies)
    return { success: true, token: allCookies, durationMs: Date.now() - start }
  } catch (err: any) {
    return { success: false, error: err.message || 'Bilinmeyen hata', durationMs: Date.now() - start }
  }
}

// ============================================================
// Map: tedarikçi adı → fonksiyon
// ============================================================
export const refresherMap: Record<string, () => Promise<LoginResult>> = {
  'Civaner': refreshCivaner,
  'AbmHirdavat': refreshAbmHirdavat,
  'Akinziraat': refreshAkinziraat,
  'Catpower': refreshCatpower,
  'Mapas': refreshMapas,
  'Ital': refreshItal,
}

export const SUPPORTED_SUPPLIERS = Object.keys(refresherMap)
