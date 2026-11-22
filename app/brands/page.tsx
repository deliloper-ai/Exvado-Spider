"use client"

import React, { useState, useEffect, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { brandService, aiService } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Tag,
  Eye,
  EyeOff,
  Sparkles,
  Save,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

// Marka tipi
type Brand = {
  id: string
  name: string
  slug: string
  isActive: boolean
  productCount: number
  order: number
  metaTitle?: string
  metaDescription?: string
  logo?: string
}

// API'den yüklenecek

export default function BrandsPage() {
  const { toast } = useToast()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editModal, setEditModal] = useState<{ open: boolean; brand: Brand | null }>({ open: false, brand: null })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; brandId: string | null }>({ open: false, brandId: null })
  const [addModal, setAddModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [addForm, setAddForm] = useState({ name: '', isActive: true, metaTitle: '', metaDescription: '' })
  const [editForm, setEditForm] = useState({ name: '', isActive: true, metaTitle: '', metaDescription: '' })
  const [aiGenerating, setAiGenerating] = useState<string | null>(null)

  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true)
      const response = await brandService.getAll()
      if (response.success && response.data) {
        setBrands(response.data.map((b: any) => ({
          id: b.id,
          name: b.name,
          slug: b.slug || '',
          isActive: b.isActive ?? true,
          productCount: 0,
          order: b.order ?? 0,
          metaTitle: b.metaTitle,
          metaDescription: b.metaDescription,
          logo: b.logo,
        })))
      }
    } catch {
      toast({ title: "Hata", description: "Markalar yüklenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

  // Edit modal açıldığında editForm'u doldur
  useEffect(() => {
    if (editModal.open && editModal.brand) {
      setEditForm({
        name: editModal.brand.name,
        isActive: editModal.brand.isActive,
        metaTitle: editModal.brand.metaTitle || '',
        metaDescription: editModal.brand.metaDescription || '',
      })
    }
  }, [editModal.open, editModal.brand])

  // Filtrelenmiş markalar
  const filteredBrands = searchTerm
    ? brands.filter(brand =>
        brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand.slug.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : brands

  // Markayı aktif/pasif yap
  const handleToggleActive = (brandId: string) => {
    setBrands(brands.map(brand =>
      brand.id === brandId ? { ...brand, isActive: !brand.isActive } : brand
    ))
  }

  // İstatistikler
  const stats = {
    totalBrands: brands.length,
    activeBrands: brands.filter(b => b.isActive).length,
    totalProducts: brands.reduce((sum, b) => sum + b.productCount, 0),
  }

  // Pagination hesaplama
  const totalPages = Math.ceil(filteredBrands.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBrands = filteredBrands.slice(startIndex, endIndex)

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-gray-50/50 dark:bg-gray-900">
        {/* İstatistikler */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Toplam Marka</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalBrands}</p>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-100 dark:border-green-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Aktif Marka</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-500">{stats.activeBrands}</p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4 border border-orange-100 dark:border-orange-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Toplam Ürün</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-500">{stats.totalProducts}</p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Marka ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setAddModal(true)}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-shadow"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Marka
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card className="shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white dark:bg-gray-900 border-b dark:border-gray-700">
                    <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 w-[400px]">
                      Marka Adı
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 w-[200px]">
                      Slug
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 text-center w-[100px]">
                      Ürün Sayısı
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 text-center w-[100px]">
                      Durum
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 text-center w-[150px]">
                      İşlemler
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBrands.map((brand) => (
                    <TableRow
                      key={brand.id}
                      className="border-b dark:border-gray-700 hover:bg-blue-50/30 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <TableCell className="py-2 h-12">
                        <div className="flex items-center">
                          <Tag className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                            {brand.name}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-gray-600 dark:text-gray-400 py-2 h-12">
                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-[10px]">
                          /{brand.slug}
                        </code>
                      </TableCell>

                      <TableCell className="text-xs text-center text-gray-900 dark:text-gray-100 py-2 h-12">
                        {brand.productCount}
                      </TableCell>

                      <TableCell className="py-2 h-12 text-center">
                        {brand.isActive ? (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700">
                            <Eye className="h-3 w-3 mr-1" />
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Pasif
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="py-2 h-12 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-600 hover:text-gray-900 dark:text-gray-100"
                            title="Düzenle"
                            onClick={() => setEditModal({ open: true, brand })}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${
                              brand.isActive
                                ? "text-green-600 hover:text-green-700"
                                : "text-red-600 hover:text-red-700"
                            }`}
                            onClick={() => handleToggleActive(brand.id)}
                            title={brand.isActive ? "Pasif Yap" : "Aktif Yap"}
                          >
                            {brand.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700 dark:text-red-400"
                            title="Sil"
                            onClick={() => setDeleteModal({ open: true, brandId: brand.id })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div>
            <span>Toplam {filteredBrands.length} marka bulunmaktadır.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="bg-white dark:bg-gray-800"
            >
              &lt; Önceki
            </Button>
            <span className="px-3 py-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded">
              {currentPage} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="bg-white dark:bg-gray-800"
            >
              Sonraki &gt;
            </Button>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => {
              setItemsPerPage(Number(value))
              setCurrentPage(1)
            }}>
              <SelectTrigger className="w-20 bg-white dark:bg-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Add Brand Sheet */}
        <Sheet open={addModal} onOpenChange={(open) => {
          setAddModal(open)
          if (!open) setAddForm({ name: '', isActive: true, metaTitle: '', metaDescription: '' })
        }}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Yeni Marka Ekle</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 p-6">
              {/* Marka Bilgileri */}
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                  Marka Bilgileri
                </h3>

                <div className="space-y-3">
                  <Label htmlFor="add-name" className="text-xs">Marka Adı</Label>
                  <Input
                    id="add-name"
                    value={addForm.name}
                    onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                    className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    placeholder="Marka adını girin"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <Label htmlFor="add-active" className="text-xs font-medium">Marka Durumu</Label>
                  <Switch
                    id="add-active"
                    checked={addForm.isActive}
                    onCheckedChange={(checked) => setAddForm(prev => ({ ...prev, isActive: checked }))}
                    className="scale-125 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:via-violet-500 data-[state=checked]:to-indigo-500"
                  />
                </div>
              </div>

              {/* SEO Ayarları */}
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                  SEO Ayarları
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="add-meta-title" className="text-xs">Meta Title</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={aiGenerating === 'add-meta'}
                      onClick={async () => {
                        if (!addForm.name.trim()) {
                          toast({ title: "Uyarı", description: "Önce marka adını girin", variant: "destructive" })
                          return
                        }
                        setAiGenerating('add-meta')
                        try {
                          const result = await aiService.generateBrandMeta(addForm.name)
                          setAddForm(prev => ({ ...prev, metaTitle: result.title, metaDescription: result.description }))
                          toast({ title: "Başarılı", description: "Meta bilgileri AI ile oluşturuldu" })
                        } catch (err: any) {
                          toast({ title: "Hata", description: err.message || "AI ile oluşturulamadı", variant: "destructive" })
                        } finally {
                          setAiGenerating(null)
                        }
                      }}
                      className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 disabled:opacity-50"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {aiGenerating === 'add-meta' ? 'Oluşturuluyor...' : 'AI ile Oluştur'}
                    </Button>
                  </div>
                  <Input
                    id="add-meta-title"
                    value={addForm.metaTitle}
                    onChange={(e) => setAddForm(prev => ({ ...prev, metaTitle: e.target.value }))}
                    className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    placeholder="SEO için meta başlık girin"
                    maxLength={60}
                  />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Önerilen: 50-60 karakter
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="add-meta-desc" className="text-xs">Meta Description</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={aiGenerating === 'add-meta'}
                      onClick={async () => {
                        if (!addForm.name.trim()) {
                          toast({ title: "Uyarı", description: "Önce marka adını girin", variant: "destructive" })
                          return
                        }
                        setAiGenerating('add-meta')
                        try {
                          const result = await aiService.generateBrandMeta(addForm.name)
                          setAddForm(prev => ({ ...prev, metaTitle: result.title, metaDescription: result.description }))
                          toast({ title: "Başarılı", description: "Meta bilgileri AI ile oluşturuldu" })
                        } catch (err: any) {
                          toast({ title: "Hata", description: err.message || "AI ile oluşturulamadı", variant: "destructive" })
                        } finally {
                          setAiGenerating(null)
                        }
                      }}
                      className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 disabled:opacity-50"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {aiGenerating === 'add-meta' ? 'Oluşturuluyor...' : 'AI ile Oluştur'}
                    </Button>
                  </div>
                  <Textarea
                    id="add-meta-desc"
                    value={addForm.metaDescription}
                    onChange={(e) => setAddForm(prev => ({ ...prev, metaDescription: e.target.value }))}
                    className="text-xs min-h-[80px] resize-none bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    placeholder="SEO için meta açıklama girin"
                    maxLength={160}
                  />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Önerilen: 150-160 karakter
                  </p>
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setAddModal(false)}
                  className="flex-1 h-10"
                >
                  İptal
                </Button>
                <Button
                  className="flex-1 h-10 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transition-shadow"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Kaydet
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Edit Brand Sheet */}
        <Sheet open={editModal.open} onOpenChange={(open) => {
          if (open && editModal.brand) {
            setEditForm({
              name: editModal.brand.name,
              isActive: editModal.brand.isActive,
              metaTitle: editModal.brand.metaTitle || '',
              metaDescription: editModal.brand.metaDescription || '',
            })
          }
          if (!open) setEditModal({ open: false, brand: null })
        }}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Marka Düzenle</SheetTitle>
            </SheetHeader>
            {editModal.brand && (
              <div className="space-y-6 p-6">
                {/* Marka Bilgileri */}
                <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                    Marka Bilgileri
                  </h3>

                  <div className="space-y-3">
                    <Label htmlFor="edit-name" className="text-xs">Marka Adı</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      className="text-xs bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-not-allowed"
                      placeholder="Marka adını girin"
                      disabled
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-4">
                    <Label htmlFor="edit-active" className="text-xs font-medium">Marka Durumu</Label>
                    <Switch
                      id="edit-active"
                      checked={editForm.isActive}
                      onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isActive: checked }))}
                      className="scale-125 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:via-violet-500 data-[state=checked]:to-indigo-500"
                    />
                  </div>
                </div>

                {/* SEO Ayarları */}
                <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                    SEO Ayarları
                  </h3>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="edit-meta-title" className="text-xs">Meta Title</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={aiGenerating === 'edit-meta'}
                        onClick={async () => {
                          if (!editForm.name.trim()) {
                            toast({ title: "Uyarı", description: "Marka adı boş", variant: "destructive" })
                            return
                          }
                          setAiGenerating('edit-meta')
                          try {
                            const result = await aiService.generateBrandMeta(editForm.name)
                            setEditForm(prev => ({ ...prev, metaTitle: result.title, metaDescription: result.description }))
                            toast({ title: "Başarılı", description: "Meta bilgileri AI ile oluşturuldu" })
                          } catch (err: any) {
                            toast({ title: "Hata", description: err.message || "AI ile oluşturulamadı", variant: "destructive" })
                          } finally {
                            setAiGenerating(null)
                          }
                        }}
                        className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 disabled:opacity-50"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {aiGenerating === 'edit-meta' ? 'Oluşturuluyor...' : 'AI ile Oluştur'}
                      </Button>
                    </div>
                    <Input
                      id="edit-meta-title"
                      value={editForm.metaTitle}
                      onChange={(e) => setEditForm(prev => ({ ...prev, metaTitle: e.target.value }))}
                      className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                      placeholder="SEO için meta başlık girin"
                      maxLength={60}
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      Önerilen: 50-60 karakter
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="edit-meta-desc" className="text-xs">Meta Description</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={aiGenerating === 'edit-meta'}
                        onClick={async () => {
                          if (!editForm.name.trim()) {
                            toast({ title: "Uyarı", description: "Marka adı boş", variant: "destructive" })
                            return
                          }
                          setAiGenerating('edit-meta')
                          try {
                            const result = await aiService.generateBrandMeta(editForm.name)
                            setEditForm(prev => ({ ...prev, metaTitle: result.title, metaDescription: result.description }))
                            toast({ title: "Başarılı", description: "Meta bilgileri AI ile oluşturuldu" })
                          } catch (err: any) {
                            toast({ title: "Hata", description: err.message || "AI ile oluşturulamadı", variant: "destructive" })
                          } finally {
                            setAiGenerating(null)
                          }
                        }}
                        className="h-6 px-2 text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 disabled:opacity-50"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {aiGenerating === 'edit-meta' ? 'Oluşturuluyor...' : 'AI ile Oluştur'}
                      </Button>
                    </div>
                    <Textarea
                      id="edit-meta-desc"
                      value={editForm.metaDescription}
                      onChange={(e) => setEditForm(prev => ({ ...prev, metaDescription: e.target.value }))}
                      className="text-xs min-h-[80px] resize-none bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                      placeholder="SEO için meta açıklama girin"
                      maxLength={160}
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      Önerilen: 150-160 karakter
                    </p>
                  </div>
                </div>

                {/* Butonlar */}
                <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setEditModal({ open: false, brand: null })}
                    className="flex-1 h-10"
                  >
                    İptal
                  </Button>
                  <Button
                    className="flex-1 h-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Güncelle
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Delete Modal */}
        <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open, brandId: null })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Marka Silinemez
              </DialogTitle>
              <DialogDescription asChild>
                <div className="pt-4 space-y-4 text-sm">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Bu marka silinemez!
                  </p>

                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">⚠️</span>
                      <div className="space-y-2 flex-1">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                          Bu markaya bağlı ürünler var
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          Markayı silebilmek için öncelikle bu markaya bağlı tüm ürünlerin markalarını değiştirmeniz gerekmektedir.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-md p-3 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Bu markadaki ürün sayısı:
                        </span>
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                          {deleteModal.brandId
                            ? brands.find(b => b.id === deleteModal.brandId)?.productCount || 0
                            : 0} Ürün
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      💡 <strong>İpucu:</strong> Ürünlerin markalarını değiştirmek için "Ürün Listesi" sayfasına gidin.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ open: false, brandId: null })}
                className="w-full"
              >
                Anladım
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
