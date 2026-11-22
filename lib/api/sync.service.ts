import { api } from './client'
import type { ApiResponse } from './types'

export interface SyncProgress {
  isRunning: boolean
  currentSupplier: string | null
  currentStep: 'idle' | 'fetching' | 'normalizing' | 'upserting' | 'recalculating' | 'finalizing'
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

export interface SyncStatusResponse {
  isRunning: boolean
  progress: SyncProgress | null
  recentLogs: Array<{
    id: number
    supplierName: string
    status: 'success' | 'error'
    createdCount: number
    updatedCount: number
    totalCount: number
    duration: string | null
    error: string | null
    createdAt: string
  }>
  suppliers: Record<string, {
    status: 'success' | 'error'
    createdCount: number
    updatedCount: number
    totalCount: number
    lastRun: string
    duration: string | null
    error: string | null
  } | null>
}

export type SyncTriggerMode = 'full' | 'inventory'

export const syncApiService = {
  getStatus: async (): Promise<ApiResponse<SyncStatusResponse>> => {
    return api.get('/api/sync/status')
  },

  triggerAll: async (mode: SyncTriggerMode = 'full'): Promise<ApiResponse<{ message: string; pid?: number }>> => {
    return api.post(`/api/sync/trigger?mode=${mode}`, {})
  },

  triggerSupplier: async (supplierName: string, mode: SyncTriggerMode = 'full'): Promise<ApiResponse<{ message: string; pid?: number }>> => {
    return api.post(`/api/sync/trigger/${encodeURIComponent(supplierName)}?mode=${mode}`, {})
  },

  stop: async (): Promise<ApiResponse<{ message: string }>> => {
    return api.post('/api/sync/stop', {})
  },
}
