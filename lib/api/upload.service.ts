/**
 * Upload API Service
 * Tüm yükleme endpoint'leri /api/upload altında çalışır.
 * Yanıtlar standart ApiResponse<T> formatındadır: { success, data: { message, data } }
 */

import { api } from './client';
import type {
  UploadedFile,
  ThumbnailUrls,
  ProductImage,
  ReorderImagesDto,
  ApiResponse,
} from './types';

const BASE_URL = '/api/upload';

/** Standart API zarfından iç data'yı çıkar */
interface UploadEnvelope<T> {
  message: string;
  data: T;
}

export const uploadService = {
  /**
   * Tek görsel yükle
   */
  uploadSingleImage: async (
    file: File,
    uploadType: 'product' | 'brand' | 'category' | 'temp' = 'temp',
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<UploadEnvelope<UploadedFile>>> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('uploadType', uploadType);

    return api.upload<ApiResponse<UploadEnvelope<UploadedFile>>>(`${BASE_URL}/image`, formData, onProgress);
  },

  /**
   * Çoklu görsel yükle
   */
  uploadMultipleImages: async (
    files: File[],
    uploadType: 'product' | 'brand' | 'category' | 'temp' = 'temp',
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<UploadEnvelope<UploadedFile[]>>> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    formData.append('uploadType', uploadType);

    return api.upload<ApiResponse<UploadEnvelope<UploadedFile[]>>>(`${BASE_URL}/images`, formData, onProgress);
  },

  /**
   * Görsel yükle ve optimize et
   */
  uploadAndOptimize: async (
    file: File,
    quality: number = 80,
    uploadType: 'product' | 'brand' | 'category' | 'temp' = 'temp',
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<UploadEnvelope<UploadedFile>>> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('uploadType', uploadType);
    formData.append('quality', String(quality));

    return api.upload<ApiResponse<UploadEnvelope<UploadedFile>>>(`${BASE_URL}/optimize`, formData, onProgress);
  },

  /**
   * Thumbnails ile görsel yükle
   */
  uploadWithThumbnails: async (
    file: File,
    uploadType: 'product' | 'brand' | 'category' | 'temp' = 'temp',
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<UploadEnvelope<ThumbnailUrls>>> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('uploadType', uploadType);

    return api.upload<ApiResponse<UploadEnvelope<ThumbnailUrls>>>(`${BASE_URL}/thumbnails`, formData, onProgress);
  },

  /**
   * Ürüne görsel ekle
   */
  addProductImages: async (
    productId: string,
    files: File[],
    altText?: string,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<UploadEnvelope<ProductImage[]>>> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    if (altText) {
      formData.append('altText', altText);
    }

    return api.upload<ApiResponse<UploadEnvelope<ProductImage[]>>>(
      `${BASE_URL}/product/${productId}/images`,
      formData,
      onProgress
    );
  },

  /**
   * Ürün görselini sil
   */
  deleteProductImage: async (imageId: string): Promise<ApiResponse<{ message: string }>> => {
    return api.delete<ApiResponse<{ message: string }>>(`${BASE_URL}/product/image/${imageId}`);
  },

  /**
   * Ürün görsellerini yeniden sırala
   */
  reorderProductImages: async (productId: string, data: ReorderImagesDto): Promise<ApiResponse<UploadEnvelope<ProductImage[]>>> => {
    return api.post<ApiResponse<UploadEnvelope<ProductImage[]>>>(`${BASE_URL}/product/${productId}/reorder`, data);
  },
};
