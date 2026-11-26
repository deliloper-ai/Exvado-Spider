import cron from 'node-cron'
import { spawn } from 'child_process'
import path from 'path'
import { refreshAll as refreshAllTokens } from './token-refresher'
import { logger } from './helpers/logger'

/**
 * Cron scheduler — worker --cron modu ile başlatılır.
 *
 * Çizelge:
 *   - Full sync     : 00:00 (gece 12) — tüm katalog güncelleme + sweep
 *   - Inventory sync: 05:00 ve 14:00 (sabah 5 + öğlen 2) — envanter ürünleri + sweep
 *
 * Her sync'ten ÖNCE: tüm tedarikçiler için token refresh çalıştırılır.
 *
 * KRİTİK: sync ve XML **child spawn** ile fresh tsx process olarak çalıştırılır.
 * Sebep: cron in-process çalıştığında tsx/esbuild transform service uzun süre
 * idle kalırsa "no longer running" hatası veriyor ve preloadPlugins 0/12 fail
 * ediyor. Fresh spawn ile her sync temiz esbuild session'ıyla başlar.
 *
 * Override: SYNC_CRON_FULL ve SYNC_CRON_INVENTORY env değişkenleri
 */

const FULL_SCHEDULE = process.env.SYNC_CRON_FULL || '0 0 * * *'              // 00:00
const INVENTORY_SCHEDULE = process.env.SYNC_CRON_INVENTORY || '0 5,14 * * *' // 05:00 ve 14:00

const PROJECT_ROOT = path.resolve(__dirname, '..')
const TSX_BIN = path.join(PROJECT_ROOT, 'node_modules', '.bin', 'tsx')
const WORKER_ENTRY = path.join(PROJECT_ROOT, 'worker', 'index.ts')
const XML_ENTRY = path.join(PROJECT_ROOT, 'worker', 'xml-generator', 'index.ts')

logger.info(`Cron scheduler başlatıldı`)
logger.info(`  Full sync      : ${FULL_SCHEDULE} (gece 12)`)
logger.info(`  Inventory sync : ${INVENTORY_SCHEDULE} (sabah 5 + öğlen 2)`)
logger.info(`  Her sync öncesi tüm tedarikçi tokenleri yenilenir`)
logger.info(`  Sync ve XML fresh child process olarak spawn edilir`)

function spawnScript(label: string, args: string[]): Promise<{ ok: boolean; code: number | null }> {
  return new Promise((resolve) => {
    const child = spawn(TSX_BIN, args, {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      env: { ...process.env },
    })
    child.on('error', (err) => {
      logger.error(`[${label}] spawn hatası: ${err.message}`)
      resolve({ ok: false, code: null })
    })
    child.on('exit', (code) => {
      resolve({ ok: code === 0, code })
    })
  })
}

async function refreshTokensThenSync(label: 'FULL' | 'INVENTORY') {
  logger.info(`Cron (${label}) tetiklendi`)

  // 1) Önce tüm tedarikçi tokenlerini yenile (in-process, axios only — tsx transform gerek yok)
  logger.info(`Cron (${label}): Token yenileme başlıyor`)
  try {
    const tokens = await refreshAllTokens()
    const tokenOk = tokens.filter(t => t.success).length
    const tokenErr = tokens.length - tokenOk
    logger.info(`Cron (${label}): Token yenileme tamamlandı — ${tokenOk}/${tokens.length} başarılı${tokenErr ? ` (${tokenErr} hatalı)` : ''}`)
  } catch (err: any) {
    logger.error(`Cron (${label}): Token yenileme hatası: ${err.message} (sync devam ediyor)`)
  }

  // 2) Sync — fresh child spawn (esbuild service idle timeout sorunundan kaçınmak için)
  const mode = label === 'FULL' ? 'full' : 'inventory-only'
  const syncArgs = [WORKER_ENTRY, '--all']
  if (mode === 'inventory-only') syncArgs.push('--inventory-only')
  logger.info(`Cron (${label}): Sync spawn ediliyor (mode=${mode})`)
  const syncRes = await spawnScript(`${label}-sync`, syncArgs)
  logger.info(`Cron (${label}) sync bitti (exit=${syncRes.code})`)

  // 3) XML — fresh child spawn
  logger.info(`Cron (${label}): XML üretimi spawn ediliyor`)
  const xmlRes = await spawnScript(`${label}-xml`, [XML_ENTRY])
  logger.info(`Cron (${label}) XML bitti (exit=${xmlRes.code})`)

  logger.info(`Cron (${label}) ============= AKIŞ TAMAMLANDI =============`)
}

cron.schedule(FULL_SCHEDULE, () => refreshTokensThenSync('FULL'))
cron.schedule(INVENTORY_SCHEDULE, () => refreshTokensThenSync('INVENTORY'))

// Process'i ayakta tut
process.on('SIGTERM', () => {
  logger.info('SIGTERM alındı, çıkılıyor')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT alındı, çıkılıyor')
  process.exit(0)
})
