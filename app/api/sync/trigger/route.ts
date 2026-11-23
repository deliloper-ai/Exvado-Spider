import { NextRequest } from 'next/server'
import fs from 'fs'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'
import { syncService } from '@/lib/services/sync.service'
import { spawn } from 'child_process'
import path from 'path'

function isProgressFileActive(): boolean {
  try {
    const file = path.join(process.cwd(), 'worker', 'logs', 'progress.json')
    if (!fs.existsSync(file)) return false
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
    if (!data.isRunning) return false
    const ageSeconds = (Date.now() - new Date(data.updatedAt).getTime()) / 1000
    return ageSeconds < 30
  } catch { return false }
}

/**
 * POST /api/sync/trigger
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const dbRunning = await syncService.isRunning()
    const fileRunning = isProgressFileActive()
    if (dbRunning || fileRunning) {
      return error('Sync zaten çalışıyor', 409)
    }

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') === 'inventory' ? 'inventory-only' : 'full'

    const projectRoot = path.resolve(process.cwd())
    const workerPath = path.join(projectRoot, 'worker', 'index.ts')
    const tsxPath = 'tsx'
    const logsDir = path.join(projectRoot, 'worker', 'logs')
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
    const spawnLogPath = path.join(logsDir, 'spawn.log')
    const out = fs.openSync(spawnLogPath, 'a')
    const err = fs.openSync(spawnLogPath, 'a')

    const args = [workerPath, '--all']
    if (mode === 'inventory-only') args.push('--inventory-only')

    fs.appendFileSync(spawnLogPath, `\n[${new Date().toISOString()}] SPAWN ALL: ${tsxPath} ${args.join(' ')}\n`)

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
      fs.appendFileSync(spawnLogPath, `[${new Date().toISOString()}] SPAWN ERROR: ${e.message}\n`)
    })
    child.unref()

    return success({ message: `Sync başlatıldı (mode=${mode})`, pid: child.pid, mode })
  } catch (err: any) {
    console.error('Sync trigger hatası:', err)
    return error(err.message || 'Sync başlatılamadı', 500)
  }
}
