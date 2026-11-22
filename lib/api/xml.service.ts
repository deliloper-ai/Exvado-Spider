import { api } from './client'
import type { ApiResponse } from './types'

export interface XmlLog {
  id: number
  timestamp: string
  status: 'success' | 'partial' | 'failed'
  duration: number
  totalProducts: number
  generatedProducts: number
  failedProducts: number
  errors: { sku: string; name: string; error: string }[]
}

export interface XmlLogsResponse {
  currentFile: {
    exists: boolean
    size?: number
    sizeText?: string
    modifiedAt?: string
  }
  logs: XmlLog[]
}

export const xmlService = {
  generate: async (): Promise<ApiResponse<{ message: string; pid?: number }>> => {
    return api.post('/api/xml/generate', {})
  },
  getLogs: async (limit = 20): Promise<ApiResponse<XmlLogsResponse>> => {
    return api.get(`/api/xml/logs?limit=${limit}`)
  },
  getDownloadUrl: (): string => {
    // public/tum_urunler.xml — Next.js otomatik serve eder, auth gerek yok
    // cache busting için timestamp eklenir
    return `/tum_urunler.xml?t=${Date.now()}`
  },
}
