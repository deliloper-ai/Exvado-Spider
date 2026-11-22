/**
 * Worker giriş noktası — CLI ile çağrılır
 *
 * Kullanım:
 *   npx tsx worker/index.ts --all              # Tüm aktif tedarikçileri sync et
 *   npx tsx worker/index.ts --supplier=Ital    # Tek tedarikçi
 *   npx tsx worker/index.ts --cron             # Cron mode (scheduled jobs)
 */

import { syncAllSuppliers, syncSingleSupplier, type SyncMode } from './orchestrator'
import { logger } from './helpers/logger'

function parseArgs(): { mode: 'all' | 'single' | 'cron' | 'help'; supplier?: string; syncMode: SyncMode } {
  const args = process.argv.slice(2)
  const syncMode: SyncMode = args.includes('--inventory-only') ? 'inventory-only' : 'full'

  if (args.includes('--all')) return { mode: 'all', syncMode }
  if (args.includes('--cron')) return { mode: 'cron', syncMode }

  const supplierArg = args.find(a => a.startsWith('--supplier='))
  if (supplierArg) {
    return { mode: 'single', supplier: supplierArg.split('=')[1], syncMode }
  }

  return { mode: 'help', syncMode }
}

async function main() {
  const { mode, supplier, syncMode } = parseArgs()

  switch (mode) {
    case 'all':
      logger.info(`--all: Tüm tedarikçiler sync ediliyor (mode=${syncMode})`)
      try {
        const results = await syncAllSuppliers({ mode: syncMode })
        logger.info(`Sonuç: ${JSON.stringify(results, null, 2)}`)
        process.exit(0)
      } catch (err: any) {
        logger.error(`Sync hatası: ${err.message}`)
        process.exit(1)
      }
      break

    case 'single':
      if (!supplier) {
        logger.error('--supplier= gereklidir')
        process.exit(1)
      }
      logger.info(`--supplier=${supplier} (mode=${syncMode}): Tek tedarikçi sync ediliyor`)
      try {
        const result = await syncSingleSupplier(supplier, { mode: syncMode })
        logger.info(`Sonuç: ${JSON.stringify(result, null, 2)}`)
        process.exit(0)
      } catch (err: any) {
        logger.error(`Sync hatası: ${err.message}`)
        process.exit(1)
      }
      break

    case 'cron':
      logger.info('--cron: Cron scheduler başlatılıyor')
      await import('./cron')
      // Cron çalıştığı sürece process açık kalır
      break

    default:
      console.log(`
Exvado Spider Worker

Kullanım:
  npx tsx worker/index.ts --all                  Tüm aktif tedarikçileri sync et
  npx tsx worker/index.ts --supplier=Ital        Tek tedarikçi sync et
  npx tsx worker/index.ts --cron                 Cron scheduler başlat
`)
      process.exit(0)
  }
}

main().catch(err => {
  logger.error(`Fatal: ${err.message}`)
  process.exit(1)
})
