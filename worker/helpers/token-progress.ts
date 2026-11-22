import fs from 'fs'
import path from 'path'

/**
 * Token refresh progress takibi — disk-based JSON.
 * Sync progress'ten ayrı dosyada tutulur ki sync ve token refresh çakışmasın.
 */

export interface TokenSupplierState {
  supplier: string
  status: 'pending' | 'running' | 'success' | 'error'
  startedAt: string | null
  finishedAt: string | null
  durationSec?: number
  tokenLength?: number
  error?: string
}

export interface TokenProgress {
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

const PROGRESS_FILE = path.join(__dirname, '..', 'logs', 'token-progress.json')

const DEFAULT: TokenProgress = {
  isRunning: false,
  startedAt: null,
  finishedAt: null,
  updatedAt: new Date().toISOString(),
  current: null,
  total: 0,
  successCount: 0,
  errorCount: 0,
  suppliers: [],
}

let buffer: TokenProgress = { ...DEFAULT, suppliers: [] }

function flush() {
  buffer.updatedAt = new Date().toISOString()
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(buffer, null, 2))
  } catch {
    // sessizce yut
  }
}

export function startTokenRefresh(suppliers: string[]) {
  buffer = {
    isRunning: true,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    updatedAt: new Date().toISOString(),
    current: null,
    total: suppliers.length,
    successCount: 0,
    errorCount: 0,
    suppliers: suppliers.map(s => ({
      supplier: s,
      status: 'pending',
      startedAt: null,
      finishedAt: null,
    })),
  }
  flush()
}

export function markSupplierRunning(supplier: string) {
  buffer.current = supplier
  const entry = buffer.suppliers.find(s => s.supplier === supplier)
  if (entry) {
    entry.status = 'running'
    entry.startedAt = new Date().toISOString()
  } else {
    buffer.suppliers.push({
      supplier,
      status: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
    })
  }
  flush()
}

export function markSupplierDone(
  supplier: string,
  result: { success: boolean; durationSec: number; tokenLength?: number; error?: string },
) {
  const entry = buffer.suppliers.find(s => s.supplier === supplier)
  const finishedAt = new Date().toISOString()
  if (entry) {
    entry.status = result.success ? 'success' : 'error'
    entry.finishedAt = finishedAt
    entry.durationSec = result.durationSec
    entry.tokenLength = result.tokenLength
    entry.error = result.error
  }
  if (result.success) buffer.successCount++
  else buffer.errorCount++
  flush()
}

export function endTokenRefresh() {
  buffer.isRunning = false
  buffer.current = null
  buffer.finishedAt = new Date().toISOString()
  flush()
}

export function readTokenProgress(): TokenProgress {
  try {
    if (!fs.existsSync(PROGRESS_FILE)) return { ...DEFAULT, suppliers: [] }
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf-8')
    return JSON.parse(raw) as TokenProgress
  } catch {
    return { ...DEFAULT, suppliers: [] }
  }
}
