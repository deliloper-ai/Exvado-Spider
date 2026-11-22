/**
 * Category API Service
 */

import { api } from './client';
import type {
  ApiResponse,
  Category,
  CategoryTree,
  CreateCategoryDto,
  UpdateCategoryDto,
  ReorderCategoryDto,
  CommissionData,
  UpdateCommissionsDto,
  BulkUpdateCommissionsDto,
} from './types';

const BASE_URL = '/api/categories';

export const categoryService = {
  /**
   * Tüm kategorileri getir
   */
  getAll: async (): Promise<ApiResponse<Category[]>> => {
    return api.get<ApiResponse<Category[]>>(BASE_URL);
  },

  /**
   * Kategori tree yapısını getir
   */
  getTree: async (): Promise<ApiResponse<CategoryTree[]>> => {
    return api.get<ApiResponse<CategoryTree[]>>(`${BASE_URL}/tree`);
  },

  /**
   * ID'ye göre kategori getir
   */
  getById: async (id: string): Promise<ApiResponse<Category>> => {
    return api.get<ApiResponse<Category>>(`${BASE_URL}/${id}`);
  },

  /**
   * Yeni kategori oluştur
   */
  create: async (data: CreateCategoryDto): Promise<ApiResponse<Category>> => {
    return api.post<ApiResponse<Category>>(BASE_URL, data);
  },

  /**
   * Kategori güncelle
   */
  update: async (id: string, data: UpdateCategoryDto): Promise<ApiResponse<Category>> => {
    return api.put<ApiResponse<Category>>(`${BASE_URL}/${id}`, data);
  },

  /**
   * Kategori sil
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete<ApiResponse<void>>(`${BASE_URL}/${id}`);
  },

  /**
   * Kategorileri yeniden sırala
   */
  reorder: async (data: ReorderCategoryDto): Promise<ApiResponse<void>> => {
    return api.post<ApiResponse<void>>(`${BASE_URL}/reorder`, data);
  },

  /**
   * Kategorinin komisyon oranlarını getir
   */
  getCommissions: async (categoryId: string): Promise<ApiResponse<CommissionData>> => {
    return api.get<ApiResponse<CommissionData>>(`${BASE_URL}/${categoryId}/commissions`);
  },

  /**
   * Kategorinin komisyon oranlarını güncelle
   */
  updateCommissions: async (categoryId: string, data: UpdateCommissionsDto): Promise<ApiResponse<void>> => {
    return api.put<ApiResponse<void>>(`${BASE_URL}/${categoryId}/commissions`, data);
  },

  /**
   * Birden fazla kategoriye aynı komisyon oranlarını uygula
   */
  bulkUpdateCommissions: async (data: BulkUpdateCommissionsDto): Promise<ApiResponse<void>> => {
    return api.post<ApiResponse<void>>(`${BASE_URL}/bulk-commissions`, data);
  },
};
