/**
 * Desi API Service
 */

import { api } from './client'
import type { ApiResponse, DesiFrontend } from './types'

const BASE_URL = '/api/desi'

export const desiService = {
  getAll: async (): Promise<ApiResponse<DesiFrontend[]>> => {
    return api.get<ApiResponse<DesiFrontend[]>>(BASE_URL)
  },

  create: async (data: { name: string; price: number }): Promise<ApiResponse<DesiFrontend>> => {
    return api.post<ApiResponse<DesiFrontend>>(BASE_URL, data)
  },

  update: async (id: string, data: { name?: string; price?: number }): Promise<ApiResponse<DesiFrontend>> => {
    return api.put<ApiResponse<DesiFrontend>>(`${BASE_URL}/${id}`, data)
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete<ApiResponse<void>>(`${BASE_URL}/${id}`)
  },
}
