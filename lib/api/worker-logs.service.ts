import { api } from './client'
import type { ApiResponse } from './types'

export interface WorkerLogFile {
  name: string
  category: 'token' | 'sync' | 'xml' | 'spawn' | 'other'
  size: number
  sizeText: string
  modifiedAt: string
}

export interface WorkerLogContent {
  name: string
  size: number
  modifiedAt: string
  totalLines: number
  returnedLines: number
  content: string
}

export const workerLogsService = {
  list: (): Promise<ApiResponse<{ files: WorkerLogFile[] }>> =>
    api.get('/api/worker-logs'),

  read: (name: string, lines = 500, full = false): Promise<ApiResponse<WorkerLogContent>> => {
    const qs = new URLSearchParams()
    qs.set('lines', String(lines))
    if (full) qs.set('full', '1')
    return api.get(`/api/worker-logs/${encodeURIComponent(name)}?${qs.toString()}`)
  },
}
