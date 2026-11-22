import { prisma } from '../../lib/db/prisma'
import { logger } from '../helpers/logger'

/**
 * Türkçe karakterleri ASP.NET cookie mojibake formatına çevirir.
 * Eski token-crawler'daki orijinal map.
 */
const turkishToMojibake: Record<string, string> = {
  'Ğ': 'ÄŸ', 'Ü': 'Ãœ', 'Ş': 'ÅŸ', 'İ': 'Ä°', 'Ö': 'Ã–', 'Ç': 'Ã‡',
  'ğ': 'ÄŸ', 'ü': 'Ã¼', 'ş': 'ÅŸ', 'ı': 'Ä±', 'ö': 'Ã¶', 'ç': 'Ã§',
}

export function applyMojibakeFix(s: string): string {
  return s.replace(/[ĞÜŞİÖÇğüşıöç]/g, m => turkishToMojibake[m] || m)
}

export interface SupplierCredentials {
  name: string
  username: string | null
  password: string | null
  login_url: string | null
}

export interface LoginResult {
  success: boolean
  token?: string
  error?: string
  durationMs: number
}

/**
 * DB'de tedarikçinin token'ını güncelle
 */
export async function saveTokenToDb(supplierName: string, token: string): Promise<void> {
  const now = new Date()
  await prisma.supplier.updateMany({
    where: { name: supplierName },
    data: { token, token_updated_at: now, updated_at: now },
  })
  logger.info(`[token-refresher] ${supplierName} token DB'ye yazıldı (${token.length} karakter)`)
}

/**
 * Tedarikçi credentials'larını DB'den oku
 */
export async function getSupplierCredentials(name: string): Promise<SupplierCredentials | null> {
  const sup = await prisma.supplier.findFirst({
    where: { name },
    select: { name: true, username: true, password: true, login_url: true },
  })
  if (!sup) return null
  return sup as SupplierCredentials
}
