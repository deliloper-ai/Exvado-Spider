/**
 * Supplier Log API Service
 */

import { api } from './client'
import type { PaginatedResponse } from './types'
import type { SupplierLogFrontend } from './types'

const BASE_URL = '/api/supplier-logs'

export const supplierLogService = {
  getAll: async (params?: {
    page?: number
    limit?: number
    status?: string
    supplier?: string
    search?: string
  }): Promise<PaginatedResponse<SupplierLogFrontend>> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status)
    if (params?.supplier && params.supplier !== 'all') searchParams.set('supplier', params.supplier)
    if (params?.search) searchParams.set('search', params.search)

    const query = searchParams.toString()
    return api.get<PaginatedResponse<SupplierLogFrontend>>(`${BASE_URL}${query ? `?${query}` : ''}`)
  },
}
