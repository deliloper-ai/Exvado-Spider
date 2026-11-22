/**
 * Token Refresher CLI / Orchestrator
 *
 * Kullanım:
 *   npx tsx worker/token-refresher/index.ts --all
 *   npx tsx worker/token-refresher/index.ts --supplier=Ital
 */

import { refresherMap, SUPPORTED_SUPPLIERS } from './refreshers'
import { logger } from '../helpers/logger'
import type { LoginResult } from './_base'
import {
  startTokenRefresh,
  markSupplierRunning,
  markSupplierDone,
  endTokenRefresh,
} from '../helpers/token-progress'

export interface RefreshSummary {
  supplierName: string
  success: boolean
  durationSec: number
  tokenLength?: number
  error?: string
}

export async function refreshOne(supplier: string, reportProgress = false): Promise<RefreshSummary> {
  const fn = refresherMap[supplier]
  if (!fn) {
    return { supplierName: supplier, success: false, durationSec: 0, error: `Desteklenmeyen tedarikçi: ${supplier}. Desteklenenler: ${SUPPORTED_SUPPLIERS.join(', ')}` }
  }
  if (reportProgress) markSupplierRunning(supplier)
  const result: LoginResult = await fn()
  const summary: RefreshSummary = {
    supplierName: supplier,
    success: result.success,
    durationSec: result.durationMs / 1000,
    tokenLength: result.token?.length,
    error: result.error,
  }
  if (reportProgress) {
    markSupplierDone(supplier, {
      success: summary.success,
      durationSec: summary.durationSec,
      tokenLength: summary.tokenLength,
      error: summary.error,
    })
  }
  return summary
}

export async function refreshAll(): Promise<RefreshSummary[]> {
  const results: RefreshSummary[] = []
  startTokenRefresh(SUPPORTED_SUPPLIERS)
  try {
    for (const supplier of SUPPORTED_SUPPLIERS) {
      logger.info(`========== ${supplier} token yenileme ==========`)
      try {
        const r = await refreshOne(supplier, true)
        results.push(r)
        logger.info(
          `[${supplier}] ${r.success ? '✓' : '✗'} (${r.durationSec.toFixed(1)}s) ` +
          (r.success ? `${r.tokenLength} karakter` : `HATA: ${r.error}`)
        )
      } catch (err: any) {
        const summary = { supplierName: supplier, success: false, durationSec: 0, error: err.message }
        results.push(summary)
        markSupplierDone(supplier, { success: false, durationSec: 0, error: err.message })
        logger.error(`[${supplier}] FATAL: ${err.message}`)
      }
    }
  } finally {
    endTokenRefresh()
  }
  return results
}

// CLI entry — path check (require.main === module bundle içinde güvenilir değil)
const __isTokenRefresherEntry = !!process.argv[1]?.match(/token-refresher[\/\\]index\.(js|ts)$/)
if (__isTokenRefresherEntry) {
  ;(async () => {
    const args = process.argv.slice(2)
    const supplierArg = args.find(a => a.startsWith('--supplier='))

    if (args.includes('--all')) {
      const results = await refreshAll()
      const ok = results.filter(r => r.success).length
      logger.info(`\n========== TAMAMLANDI: ${ok}/${results.length} başarılı ==========`)
      process.exit(ok === results.length ? 0 : 1)
    } else if (supplierArg) {
      const supplier = supplierArg.split('=')[1]
      startTokenRefresh([supplier])
      try {
        const result = await refreshOne(supplier, true)
        logger.info(JSON.stringify(result, null, 2))
        process.exit(result.success ? 0 : 1)
      } finally {
        endTokenRefresh()
      }
    } else {
      console.log(`
Token Refresher

Kullanım:
  npx tsx worker/token-refresher/index.ts --all
  npx tsx worker/token-refresher/index.ts --supplier=Ital

Desteklenen tedarikçiler: ${SUPPORTED_SUPPLIERS.join(', ')}
`)
      process.exit(0)
    }
  })()
}
