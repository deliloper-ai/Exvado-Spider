/**
 * Specification API Service
 */

import { api } from './client'
import type { ApiResponse } from './types'
import type { SpecificationFrontend, SpecGroupFrontend } from './types'

const BASE_URL = '/api/specifications'

export interface SpecListResponse {
  items: SpecificationFrontend[]
  total: number
  page: number
  limit: number
}

export const specificationService = {
  getAll: async (): Promise<ApiResponse<SpecificationFrontend[]>> => {
    return api.get<ApiResponse<SpecificationFrontend[]>>(BASE_URL)
  },

  list: async (params: { page?: number; limit?: number; search?: string } = {}): Promise<ApiResponse<SpecListResponse>> => {
    const qs = new URLSearchParams()
    qs.set('page', String(params.page || 1))
    qs.set('limit', String(params.limit || 20))
    if (params.search) qs.set('search', params.search)
    return api.get<ApiResponse<SpecListResponse>>(`${BASE_URL}?${qs.toString()}`)
  },

  create: async (data: { name: string; groupId: string; order?: number }): Promise<ApiResponse<any>> => {
    return api.post<ApiResponse<any>>(BASE_URL, data)
  },

  update: async (id: string, data: { name?: string; order?: number }): Promise<ApiResponse<any>> => {
    return api.put<ApiResponse<any>>(`${BASE_URL}/${id}`, data)
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete<ApiResponse<void>>(`${BASE_URL}/${id}`)
  },

  createGroup: async (data: { name: string; isActive?: boolean; order?: number }): Promise<ApiResponse<SpecGroupFrontend>> => {
    return api.post<ApiResponse<SpecGroupFrontend>>(`${BASE_URL}/groups`, data)
  },

  updateGroup: async (id: string, data: { name?: string; isActive?: boolean; order?: number }): Promise<ApiResponse<SpecGroupFrontend>> => {
    return api.put<ApiResponse<SpecGroupFrontend>>(`${BASE_URL}/groups/${id}`, data)
  },

  deleteGroup: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete<ApiResponse<void>>(`${BASE_URL}/groups/${id}`)
  },
}
