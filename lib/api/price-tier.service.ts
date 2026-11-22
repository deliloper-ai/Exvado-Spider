/**
 * Price Tier API Service
 */

import { api } from './client';
import type { ApiResponse, PriceTier } from './types';

const BASE_URL = '/api/price-tiers';

export const priceTierService = {
  /**
   * Tüm fiyat kademelerini getir
   */
  getAll: async (): Promise<ApiResponse<PriceTier[]>> => {
    return api.get<ApiResponse<PriceTier[]>>(BASE_URL);
  },

  /**
   * Yeni fiyat kademesi oluştur
   */
  create: async (data: { minPrice: number; maxPrice: number; order?: number }): Promise<ApiResponse<PriceTier>> => {
    return api.post<ApiResponse<PriceTier>>(BASE_URL, data);
  },

  /**
   * Fiyat kademesi güncelle
   */
  update: async (id: string, data: { minPrice?: number; maxPrice?: number; order?: number }): Promise<ApiResponse<PriceTier>> => {
    return api.put<ApiResponse<PriceTier>>(`${BASE_URL}/${id}`, data);
  },

  /**
   * Fiyat kademesi sil
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete<ApiResponse<void>>(`${BASE_URL}/${id}`);
  },
};
