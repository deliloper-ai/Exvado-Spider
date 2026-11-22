/**
 * Product API Service
 */

import { api } from './client';
import type {
  ApiResponse,
  PaginatedResponse,
  Product,
  CreateProductDto,
  UpdateProductDto,
  UpdateProductStockDto,
  ProductFilters,
} from './types';

const BASE_URL = '/api/products';

export const productService = {
  /**
   * Tüm ürünleri getir (filtreleme ve sayfalama ile)
   */
  getAll: async (filters?: ProductFilters): Promise<PaginatedResponse<Product>> => {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

    return api.get<PaginatedResponse<Product>>(url);
  },

  /**
   * ID'ye göre ürün getir
   */
  getById: async (id: string): Promise<ApiResponse<Product>> => {
    return api.get<ApiResponse<Product>>(`${BASE_URL}/${id}`);
  },

  /**
   * Yeni ürün oluştur
   */
  create: async (data: CreateProductDto): Promise<ApiResponse<Product>> => {
    return api.post<ApiResponse<Product>>(BASE_URL, data);
  },

  /**
   * Ürün güncelle
   */
  update: async (id: string, data: UpdateProductDto): Promise<ApiResponse<Product>> => {
    return api.put<ApiResponse<Product>>(`${BASE_URL}/${id}`, data);
  },

  /**
   * Ürün sil
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete<ApiResponse<void>>(`${BASE_URL}/${id}`);
  },

  /**
   * Ürün stok güncelle
   */
  updateStock: async (id: string, data: UpdateProductStockDto): Promise<ApiResponse<Product>> => {
    return api.patch<ApiResponse<Product>>(`${BASE_URL}/${id}/stock`, data);
  },

  /**
   * Tek ürün için fiyat hesapla
   * desi veya kategori değiştiğinde frontend'den çağrılır
   */
  calculatePrice: async (data: {
    tedarikciFiyat: number;
    categoryId: string;
    supplierDiscount?: number;
    desiPrice?: number;
  }): Promise<ApiResponse<{
    baseFiyat: number;
    kategoriOran: number;
    bolbolbulFiyat: number;
    sopyoFiyat: number;
    n11Fiyat: number;
    trendyolFiyat: number;
    hepsiburadaFiyat: number;
    pazaramaFiyat: number;
  }>> => {
    return api.post(`${BASE_URL}/calculate-price`, data);
  },

  /**
   * Tüm ürünlerin fiyatlarını yeniden hesapla
   */
  recalculateAll: async (): Promise<ApiResponse<{
    message: string;
    updated: number;
    skipped: number;
    total: number;
  }>> => {
    return api.post(`${BASE_URL}/recalculate-all`);
  },
};
