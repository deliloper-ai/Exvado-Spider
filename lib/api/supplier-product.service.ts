import { api } from './client'
import type { ApiResponse, PaginatedResponse } from './types'

export interface SupplierProductDTO {
  id: string
  supplierName: string | null
  productTitle: string | null
  productCode: string | null
  netPriceWithVAT: number | null
  productPictures: string | null
  productStockStatus: string | null
  envanterStatus: boolean
  stock: number | null
  brand: string | null
  bizimhesapFiyat: number | null
  bizimhesapStock: number | null
  isFiyatTercih: boolean
  updatedAt: string
}

export interface SupplierProductFilters {
  page?: number
  limit?: number
  search?: string
  supplier?: string
  envanterStatus?: '0' | '1'
  stockStatus?: 'in_stock' | 'out_of_stock'
  sortOrder?: 'asc' | 'desc'
}

const BASE_URL = '/api/supplier-products'

export const supplierProductService = {
  getAll: async (filters?: SupplierProductFilters): Promise<PaginatedResponse<SupplierProductDTO>> => {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })
    }
    const qs = params.toString()
    return api.get<PaginatedResponse<SupplierProductDTO>>(qs ? `${BASE_URL}?${qs}` : BASE_URL)
  },

  getById: async (id: string): Promise<ApiResponse<SupplierProductDTO>> => {
    return api.get<ApiResponse<SupplierProductDTO>>(`${BASE_URL}/${id}`)
  },

  addToInventory: async (id: string, data: {
    categoryId: string
    desi?: number
    kdv?: number
    brand?: string
    barcode?: string
  }): Promise<ApiResponse<any>> => {
    return api.post(`${BASE_URL}/${id}/add-to-inventory`, data)
  },
}
