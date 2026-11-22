import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'

/**
 * POST /api/xml/generate
 * XML üretimini arka planda tetikler.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const projectRoot = path.resolve(process.cwd())
    const workerPath = path.join(projectRoot, 'worker-dist', 'xml-generator', 'index.js')
    const tsxPath = process.execPath
    const logsDir = path.join(projectRoot, 'worker', 'logs')
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
    const logPath = path.join(logsDir, 'xml-generator.log')
    const out = fs.openSync(logPath, 'a')
    const err = fs.openSync(logPath, 'a')

    fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] SPAWN: ${tsxPath} ${workerPath}\n`)

    const child = spawn(tsxPath, [workerPath], {
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
      message: 'XML üretimi başlatıldı (arka planda çalışıyor)',
      pid: child.pid,
      logPath: 'worker/logs/xml-generator.log',
    })
  } catch (err: any) {
    console.error('XML generate trigger hatası:', err)
    return error(err.message || 'XML üretimi başlatılamadı', 500)
  }
}
