import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'
import { authenticateRequest, isAuthError } from '@/lib/middleware/auth'
import { success, error } from '@/lib/utils/response'

const LOGS_DIR = path.join(process.cwd(), 'worker', 'logs')

function categorize(name: string): 'token' | 'sync' | 'xml' | 'spawn' | 'other' {
  if (name.startsWith('token-')) return 'token'
  if (name.startsWith('sync_')) return 'sync'
  if (name.startsWith('xml-')) return 'xml'
  if (name.startsWith('spawn')) return 'spawn'
  return 'other'
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request)
  if (isAuthError(auth)) return error(auth.error, auth.status)

  try {
    if (!fs.existsSync(LOGS_DIR)) {
      return success({ files: [] })
    }
    const entries = fs.readdirSync(LOGS_DIR)
      .filter(f => f.endsWith('.log') || f.endsWith('.json'))
      .map(name => {
        const full = path.join(LOGS_DIR, name)
        const stat = fs.statSync(full)
        return {
          name,
          category: categorize(name),
          size: stat.size,
          sizeText: fmtBytes(stat.size),
          modifiedAt: stat.mtime.toISOString(),
        }
      })
      .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))

    return success({ files: entries })
  } catch (err: any) {
    console.error('Worker log liste hatası:', err)
    return error('Loglar listelenirken hata oluştu', 500)
  }
}
