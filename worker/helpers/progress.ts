import fs from 'fs'
import path from 'path'

/**
 * Worker progress takibi — disk-based JSON dosyasına yazar.
 * Frontend bu dosyayı /api/sync/status üzerinden okuyup canlı göstrir.
 */

export type SyncStep = 'idle' | 'fetching' | 'normalizing' | 'upserting' | 'recalculating' | 'finalizing'

export interface SyncProgress {
  isRunning: boolean
  currentSupplier: string | null
  currentStep: SyncStep
  processed: number
  total: number
  createdCount: number
  updatedCount: number
  skippedCount: number
  errorCount: number
  startedAt: string | null
  updatedAt: string
  message: string | null
}

const PROGRESS_FILE = path.join(__dirname, '..', 'logs', 'progress.json')

const DEFAULT_PROGRESS: SyncProgress = {
  isRunning: false,
  currentSupplier: null,
  currentStep: 'idle',
  processed: 0,
  total: 0,
  createdCount: 0,
  updatedCount: 0,
  skippedCount: 0,
  errorCount: 0,
  startedAt: null,
  updatedAt: new Date().toISOString(),
  message: null,
}

let buffer: SyncProgress = { ...DEFAULT_PROGRESS }
let lastWrite = 0
const WRITE_THROTTLE_MS = 300

function flushSync() {
  buffer.updatedAt = new Date().toISOString()
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(buffer, null, 2))
  } catch {
    // sessizce yut
  }
  lastWrite = Date.now()
}

/**
 * Progress'i güncelle. Throttle kuralları:
 *  - force=true ise her zaman flush
 *  - değilse son yazımdan WRITE_THROTTLE_MS geçtiyse flush
 */
export function updateProgress(patch: Partial<SyncProgress>, force = false) {
  buffer = { ...buffer, ...patch }

  const now = Date.now()
  if (force || now - lastWrite >= WRITE_THROTTLE_MS) {
    flushSync()
  }
}

/**
 * Sync başlangıcı — tüm sayaçları sıfırla
 */
export function startProgress(supplier: string | null = null) {
  buffer = {
    ...DEFAULT_PROGRESS,
    isRunning: true,
    currentSupplier: supplier,
    currentStep: 'idle',
    startedAt: new Date().toISOString(),
  }
  flushSync()
}

/**
 * Sync sonu — running=false yap, son sayaçları koru
 */
export function endProgress(message?: string) {
  buffer = {
    ...buffer,
    isRunning: false,
    currentStep: 'idle',
    currentSupplier: null,
    message: message || null,
  }
  flushSync()
}

/**
 * Disk'ten son progress'i oku — API endpoint'i kullanır
 */
export function readProgress(): SyncProgress {
  try {
    if (!fs.existsSync(PROGRESS_FILE)) return { ...DEFAULT_PROGRESS }
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf-8')
    return JSON.parse(raw) as SyncProgress
  } catch {
    return { ...DEFAULT_PROGRESS }
  }
}
