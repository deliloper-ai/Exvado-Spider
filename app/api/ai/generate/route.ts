import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'

const SYSTEM_PROMPT_META = `Sen bir e-ticaret SEO uzmanısın. bolbolbul.com için meta içerikleri üretiyorsun.

Pazarlama anahtar kelimeleri: en uygun fiyat, en ucuz, indirimli, kampanyalı, hızlı kargo, ücretsiz kargo, aynı gün kargo, güvenli alışveriş, orijinal ürün, garantili, fatura dahil, kapıda ödeme, taksitli, kredi kartına taksit, havale/EFT indirimi, toptan fiyatına, stokta var, hemen al, sınırlı stok, fırsat ürünü, çok satan, en çok tercih edilen, müşteri favorisi, hızlı iade, koşulsuz değişim, memnuniyet garantisi`

const SYSTEM_PROMPT_DESCRIPTION = `Sen bir e-ticaret içerik yazarısın. bolbolbul.com için ürün açıklamaları üretiyorsun.

Pazarlama anahtar kelimeleri: en uygun fiyat, indirimli, kampanyalı, hızlı kargo, ücretsiz kargo, güvenli alışveriş, orijinal ürün, garantili, yüksek kalite, premium ürün, profesyonel kullanım, dayanıklı, uzun ömürlü, enerji tasarruflu, ekonomik, pratik, kolay kullanım, ergonomik, şık tasarım, modern, teknolojik, yenilikçi, akıllı, kompakt, hafif, taşınabilir, sessiz çalışma, güçlü performans, yüksek verimlilik, düşük tüketim, çevre dostu, doğa dostu, geri dönüşümlü, BPA içermez, sağlıklı, hijyenik, antibakteriyel, su geçirmez, toz geçirmez, darbelere dayanıklı, paslanmaz, çizilmez, solmaz, leke tutmaz, kolay temizlenir, bakım gerektirmez, montaj dahil, kurulum desteği, teknik destek, memnuniyet garantisi`

type GenerateRequest = {
  type: 'category-meta' | 'brand-meta' | 'product-meta' | 'product-description'
  params: {
    categoryName?: string
    brandName?: string
    productName?: string
    attributes?: { name: string; value: string }[]
    minWords?: number
    maxWords?: number
  }
}

function buildPrompt(type: GenerateRequest['type'], params: GenerateRequest['params']): string {
  switch (type) {
    case 'category-meta':
      return `bolbolbul.com için '${params.categoryName}' kategorisi sayfasının meta bilgilerini üret.

Kurallar:
- Title: Kategori adı başta olsun, "bolbolbul.com" sonda yer alsın, "|" ile ayır. Maks 60 karakter.
- Description: Kullanıcıyı tıklamaya teşvik et, bir CTA (call-to-action) içersin (örn: "hemen keşfet", "fırsatları yakala"). Maks 160 karakter.
- Verdiğim pazarlama anahtar kelimelerinden uygun olanları doğal şekilde kullan.

JSON formatında yanıt ver: {"title": "...", "desc": "..."}`

    case 'brand-meta':
      return `bolbolbul.com için '${params.brandName}' markası sayfasının meta bilgilerini üret.

Kurallar:
- Title: Marka adı başta olsun, "bolbolbul.com" sonda yer alsın, "|" ile ayır. Maks 60 karakter.
- Description: Markayı güvenilir, kaliteli ve tercih edilen bir marka olarak öv. Bir CTA içersin. Maks 160 karakter.
- Verdiğim pazarlama anahtar kelimelerinden uygun olanları doğal şekilde kullan.

JSON formatında yanıt ver: {"title": "...", "desc": "..."}`

    case 'product-meta':
      return `bolbolbul.com için '${params.productName}' ürün sayfasının meta bilgilerini üret.
Kategori: ${params.categoryName}

Kurallar:
- Title: Ürün adını başta kullan, markayı ve bolbolbul.com'u dahil et. Maks 60 karakter.
- Description: Ürünün öne çıkan özelliğini vurgula, satın almaya teşvik eden bir CTA ekle. Maks 160 karakter.
- Verdiğim pazarlama anahtar kelimelerinden uygun olanları doğal şekilde kullan.

JSON formatında yanıt ver: {"title": "...", "desc": "..."}`

    case 'product-description': {
      const min = params.minWords || 150
      const max = params.maxWords || 300
      const attrs = params.attributes?.map(a => `${a.name}: ${a.value}`).join('\n') || ''
      return `'${params.productName}' ürünü için bir e-ticaret ürün açıklaması yaz.

Kurallar:
- En az ${min}, en fazla ${max} kelime olsun.
- Başlık YAZMA, sadece açıklama paragrafları yaz.
- Her paragrafı <p> etiketi ile sar. Paragraflar arası <br/> koy.
- İlk paragrafta ürünü tanıt ve öne çıkan özelliğini vurgula.
- Ortadaki paragraflarda teknik özellikleri, kullanım alanlarını ve faydalarını anlat.
- Son paragrafta neden bu ürünü tercih etmeleri gerektiğini vurgula.
- Ürün adını ve özelliklerini doğal şekilde metne serpiştir (keyword stuffing yapma).
- Türkçe, akıcı ve profesyonel bir dil kullan.

Ürün özellikleri:
${attrs}`
    }

    default:
      throw new Error('Geçersiz tür')
  }
}

function getModel(type: GenerateRequest['type']): string {
  return type === 'product-description' ? 'gpt-4o' : 'gpt-4o-mini'
}

function countWords(text: string): number {
  return text.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length
}

async function callOpenAI(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  jsonMode: boolean
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey === 'sk-your-api-key-here') {
    throw new Error('API_KEY_NOT_CONFIGURED')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `OpenAI API hatası: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body: GenerateRequest = await request.json()
    const { type, params } = body

    if (!type || !params) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz istek: type ve params gerekli' },
        { status: 400 }
      )
    }

    const model = getModel(type)
    const userPrompt = buildPrompt(type, params)
    const isJsonMode = type !== 'product-description'

    if (type === 'product-description') {
      const min = params.minWords || 150
      const max = params.maxWords || 300

      let description = ''
      let attempts = 0

      while (attempts < 3) {
        attempts++
        const result = await callOpenAI(model, SYSTEM_PROMPT_DESCRIPTION, userPrompt, false)
        description = result.trim()
        const wordCount = countWords(description)

        if (wordCount >= min && wordCount <= max) {
          break
        }

        if (attempts < 3) {
          const correctionPrompt = wordCount < min
            ? `Bu açıklama ${wordCount} kelime. En az ${min} kelime olacak şekilde genişlet. Aynı formatta yaz.`
            : `Bu açıklama ${wordCount} kelime. En fazla ${max} kelime olacak şekilde kısalt. Aynı formatta yaz.`

          const corrected = await callOpenAI(model, SYSTEM_PROMPT_DESCRIPTION, `${correctionPrompt}\n\n${description}`, false)
          description = corrected.trim()
          const newCount = countWords(description)
          if (newCount >= min && newCount <= max) break
        }
      }

      return NextResponse.json({ success: true, data: { description } })
    }

    // Meta türleri (category-meta, brand-meta, product-meta)
    const result = await callOpenAI(model, SYSTEM_PROMPT_META, userPrompt, isJsonMode)

    let parsed: { title: string; desc: string }
    try {
      parsed = JSON.parse(result)
    } catch {
      // JSON parse başarısız olursa regex ile dene
      const titleMatch = result.match(/"title"\s*:\s*"([^"]*)"/)
      const descMatch = result.match(/"desc"\s*:\s*"([^"]*)"/)
      parsed = {
        title: titleMatch?.[1] || '',
        desc: descMatch?.[1] || '',
      }
    }

    return NextResponse.json({
      success: true,
      data: { title: parsed.title, description: parsed.desc },
    })
  } catch (error: any) {
    if (error.message === 'API_KEY_NOT_CONFIGURED') {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key yapılandırılmamış. .env dosyasına OPENAI_API_KEY ekleyin.' },
        { status: 400 }
      )
    }

    console.error('AI generate error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'AI içerik üretilirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
