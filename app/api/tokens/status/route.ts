import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'

interface TokenSupplierState {
  supplier: string
  status: 'pending' | 'running' | 'success' | 'error'
  startedAt: string | null
  finishedAt: string | null
  durationSec?: number
  tokenLength?: number
  error?: string
}

interface TokenProgress {
  isRunning: boolean
  startedAt: string | null
  finishedAt: string | null
  updatedAt: string
  current: string | null
  total: number
  successCount: number
  errorCount: number
  suppliers: TokenSupplierState[]
}

function readProgress(): TokenProgress | null {
  try {
    const file = path.join(process.cwd(), 'worker', 'logs', 'token-progress.json')
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as TokenProgress
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    const progress = readProgress()
    if (!progress) {
      return success({
        isRunning: false,
        startedAt: null,
        finishedAt: null,
        updatedAt: new Date().toISOString(),
        current: null,
        total: 0,
        successCount: 0,
        errorCount: 0,
        suppliers: [],
      } as TokenProgress)
    }

    // 60 saniyeden eski güncelleme = durmuş say
    let effectiveIsRunning = progress.isRunning
    if (progress.isRunning) {
      const ageSec = (Date.now() - new Date(progress.updatedAt).getTime()) / 1000
      if (ageSec > 60) effectiveIsRunning = false
    }

    return success({ ...progress, isRunning: effectiveIsRunning })
  } catch (err: any) {
    console.error('Token progress hatası:', err)
    return error('Token durumu alınamadı', 500)
  }
}
