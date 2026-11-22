type MetaResponse = { title: string; description: string }
type DescriptionResponse = { description: string }

async function generate<T>(type: string, params: Record<string, any>): Promise<T> {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, params }),
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'AI içerik üretilirken bir hata oluştu')
  }

  return data.data
}

export const aiService = {
  generateCategoryMeta: (categoryName: string): Promise<MetaResponse> =>
    generate('category-meta', { categoryName }),

  generateBrandMeta: (brandName: string): Promise<MetaResponse> =>
    generate('brand-meta', { brandName }),

  generateProductMeta: (productName: string, categoryName: string): Promise<MetaResponse> =>
    generate('product-meta', { productName, categoryName }),

  generateProductDescription: (
    productName: string,
    attributes: { name: string; value: string }[],
    minWords?: number,
    maxWords?: number
  ): Promise<DescriptionResponse> =>
    generate('product-description', { productName, attributes, minWords, maxWords }),
}
