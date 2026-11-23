import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'

/**
 * POST /api/tokens/refresh?supplier=Ital   → tek tedarikçi
 * POST /api/tokens/refresh                 → tümü (--all)
 *
 * Worker process'i fire-and-forget olarak başlatır.
 * Süre uzun olabilir (her tedarikçi için ~10-30 saniye).
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const { searchParams } = new URL(request.url)
    const supplier = searchParams.get('supplier')

    const projectRoot = path.resolve(process.cwd())
    const workerPath = path.join(projectRoot, 'worker', 'token-refresher', 'index.ts')
    const tsxPath = 'tsx'
    const logsDir = path.join(projectRoot, 'worker', 'logs')
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
    const logPath = path.join(logsDir, 'token-refresh.log')
    const out = fs.openSync(logPath, 'a')
    const err = fs.openSync(logPath, 'a')

    const args = [workerPath]
    if (supplier) args.push(`--supplier=${supplier}`)
    else args.push('--all')

    fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] SPAWN: ${tsxPath} ${args.join(' ')}\n`)

    const child = spawn(tsxPath, args, {
      cwd: projectRoot,
      detached: true,
      stdio: ['ignore', out, err],
      env: {
        ...process.env,
        ESBUILD_BINARY_PATH: process.env.ESBUILD_BINARY_PATH || '/opt/esbuild/esbuild',
        PATH: `${path.join(projectRoot, 'node_modules', '.bin')}:${process.env.PATH || ''}`,
      },
    })
    child.on('error', (e) => {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] SPAWN ERROR: ${e.message}\n`)
    })
    child.unref()

    return success({
      message: supplier
        ? `${supplier} token yenileme başlatıldı`
        : 'Tüm tedarikçiler için token yenileme başlatıldı',
      pid: child.pid,
      logPath: 'worker/logs/token-refresh.log',
    })
  } catch (err: any) {
    console.error('Token refresh trigger hatası:', err)
    return error(err.message || 'Token yenileme başlatılamadı', 500)
  }
}
