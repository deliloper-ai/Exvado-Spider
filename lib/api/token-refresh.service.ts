import { api } from './client'
import type { ApiResponse } from './types'

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

export const tokenRefreshService = {
  refreshOne: async (supplierName: string): Promise<ApiResponse<{ message: string; pid?: number }>> => {
    return api.post(`/api/tokens/refresh?supplier=${encodeURIComponent(supplierName)}`, {})
  },

  refreshAll: async (): Promise<ApiResponse<{ message: string; pid?: number }>> => {
    return api.post('/api/tokens/refresh', {})
  },

  getStatus: async (): Promise<ApiResponse<TokenProgress>> => {
    return api.get('/api/tokens/status')
  },
}
