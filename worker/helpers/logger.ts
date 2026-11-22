import fs from 'fs'
import path from 'path'

const LOG_DIR = path.join(__dirname, '..', 'logs')

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

function getLogFilePath(): string {
  const date = new Date().toISOString().split('T')[0]
  return path.join(LOG_DIR, `sync_${date}.log`)
}

export function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`

  // Konsola yaz
  const colors = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m' }
  console.log(`${colors[level]}${line.trim()}\x1b[0m`)

  // Dosyaya yaz
  try {
    fs.appendFileSync(getLogFilePath(), line)
  } catch (err) {
    // Loglama hataları kritik değil
  }
}

export const logger = {
  info: (msg: string) => log(msg, 'info'),
  warn: (msg: string) => log(msg, 'warn'),
  error: (msg: string) => log(msg, 'error'),
}
