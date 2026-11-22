"use client"

import React, { useState, useEffect, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { categoryService, priceTierService, aiService } from "@/lib/api"
import type { CommissionData, CommissionTier, MarketplaceRates, PriceTier } from "@/lib/api"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  Tag,
  Eye,
  EyeOff,
  Sparkles,
  Save,
  Percent,
  TrendingUp,
  Coins,
  CircleDollarSign,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

// Kategori tipi
type Category = {
  id: string
  name: string
  slug: string
  level: number
  parentId: string | null
  isActive: boolean
  productCount: number
  order: number
  metaTitle?: string
  metaDescription?: string
  children?: Category[]
}

// API'den yüklenecek

export default function CategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [editModal, setEditModal] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; categoryId: string | null }>({ open: false, categoryId: null })
  const [addModal, setAddModal] = useState<{ open: boolean; parentId: string | null }>({ open: false, parentId: null })
  const [commissionModal, setCommissionModal] = useState<{
    open: boolean
    categoryId: string | null
  }>({ open: false, categoryId: null })
  const [commissionData, setCommissionData] = useState<CommissionData | null>(null)
  const [commissionTiers, setCommissionTiers] = useState<{ tierId: string; rate: number }[]>([])
  const [commissionMarketplace, setCommissionMarketplace] = useState<MarketplaceRates>({ n11: 0, trendyol: 0, hepsiburada: 0, pazarama: 0, sopyo: 0 })
  const [commissionLoading, setCommissionLoading] = useState(false)
  const [commissionSaving, setCommissionSaving] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [addForm, setAddForm] = useState({ name: '', parentId: 'none', isActive: true, metaTitle: '', metaDescription: '' })
  const [editForm, setEditForm] = useState({ name: '', parentId: 'none', isActive: true, metaTitle: '', metaDescription: '' })
  const [saving, setSaving] = useState(false)
  const [aiGenerating, setAiGenerating] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const response = await categoryService.getTree()
      if (response.success && response.data) {
        const mapTree = (items: any[], level = 1): Category[] =>
          items.map((item: any) => ({
            id: item.id,
            name: item.name,
            slug: item.slug || '',
            level,
            parentId: item.parentId || null,
            isActive: item.isActive ?? true,
            productCount: 0,
            order: item.order ?? 0,
            metaTitle: item.metaTitle,
            metaDescription: item.metaDescription,
            children: item.children?.length ? mapTree(item.children, level + 1) : undefined,
          }))
        setCategories(mapTree(response.data))
      }
    } catch {
      toast({ title: "Hata", description: "Kategoriler yüklenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Edit modal açıldığında editForm'u doldur
  useEffect(() => {
    if (editModal.open && editModal.category) {
      setEditForm({
        name: editModal.category.name,
        parentId: editModal.category.parentId || 'none',
        isActive: editModal.category.isActive,
        metaTitle: editModal.category.metaTitle || '',
        metaDescription: editModal.category.metaDescription || '',
      })
    }
  }, [editModal.open, editModal.category])

  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Komisyon modal açma handler
  const openCommissionModal = useCallback(async (categoryId: string | null) => {
    setCommissionModal({ open: true, categoryId })
    setCommissionLoading(true)
    setCommissionData(null)

    try {
      if (categoryId) {
        // Tekil kategori — komisyon oranlarını getir
        const response = await categoryService.getCommissions(categoryId)
        if (response.success && response.data) {
          setCommissionData(response.data)
          setCommissionTiers(response.data.tiers.map((t) => ({ tierId: t.tierId, rate: t.rate })))
          setCommissionMarketplace(response.data.marketplaceRates)
        }
      } else {
        // Toplu güncelleme — sadece kademe aralıklarını getir
        const response = await priceTierService.getAll()
        if (response.success && response.data) {
          setCommissionData({
            categoryId: '',
            categoryName: 'Toplu Güncelleme',
            marketplaceRates: { n11: 0, trendyol: 0, hepsiburada: 0, pazarama: 0, sopyo: 0 },
            tiers: response.data.map((t) => ({ tierId: t.id, minPrice: t.minPrice, maxPrice: t.maxPrice, rate: 0 })),
          })
          setCommissionTiers(response.data.map((t) => ({ tierId: t.id, rate: 0 })))
          setCommissionMarketplace({ n11: 0, trendyol: 0, hepsiburada: 0, pazarama: 0, sopyo: 0 })
        }
      }
    } catch {
      toast({ title: "Hata", description: "Komisyon oranları yüklenemedi", variant: "destructive" })
    } finally {
      setCommissionLoading(false)
    }
  }, [toast])

  // Komisyon kaydetme handler
  const saveCommissions = useCallback(async () => {
    setCommissionSaving(true)
    try {
      const payload = { marketplaceRates: commissionMarketplace, tiers: commissionTiers }

      if (commissionModal.categoryId) {
        await categoryService.updateCommissions(commissionModal.categoryId, payload)
        toast({ title: "Başarılı", description: "Komisyon oranları güncellendi" })
      } else {
        await categoryService.bulkUpdateCommissions({ ...payload, categoryIds: [] })
        toast({ title: "Başarılı", description: "Tüm kategorilerin komisyon oranları güncellendi" })
      }
      setCommissionModal({ open: false, categoryId: null })
    } catch {
      toast({ title: "Hata", description: "Komisyon oranları kaydedilemedi", variant: "destructive" })
    } finally {
      setCommissionSaving(false)
    }
  }, [commissionModal.categoryId, commissionTiers, commissionMarketplace, toast])

  // Kategoriyi genişlet/daralt
  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  // Tüm kategorileri düz liste olarak getir (arama için)
  const flattenCategories = (cats: Category[], parentName = ""): Array<Category & { fullPath: string }> => {
    let result: Array<Category & { fullPath: string }> = []
    cats.forEach(cat => {
      const fullPath = parentName ? `${parentName} > ${cat.name}` : cat.name
      result.push({ ...cat, fullPath })
      if (cat.children) {
        result = [...result, ...flattenCategories(cat.children, fullPath)]
      }
    })
    return result
  }

  // Filtrelenmiş kategoriler
  const filteredCategories = searchTerm
    ? flattenCategories(categories).filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : null

  // Kategoriyi aktif/pasif yap (optimistic update + API persist)
  const handleToggleActive = async (categoryId: string) => {
    const findCategory = (cats: Category[]): Category | undefined => {
      for (const cat of cats) {
        if (cat.id === categoryId) return cat
        if (cat.children) {
          const found = findCategory(cat.children)
          if (found) return found
        }
      }
      return undefined
    }
    const target = findCategory(categories)
    if (!target) return

    const newStatus = !target.isActive

    // Optimistic update
    const updateCategoryStatus = (cats: Category[]): Category[] => {
      return cats.map(cat => {
        if (cat.id === categoryId) {
          return { ...cat, isActive: newStatus }
        }
        if (cat.children) {
          return { ...cat, children: updateCategoryStatus(cat.children) }
        }
        return cat
      })
    }
    setCategories(updateCategoryStatus(categories))

    try {
      await categoryService.update(categoryId, { isActive: newStatus })
      toast({ title: "Başarılı", description: `Kategori ${newStatus ? 'aktif' : 'pasif'} yapıldı` })
    } catch {
      // Rollback
      setCategories(updateCategoryStatus(updateCategoryStatus(categories)))
      toast({ title: "Hata", description: "Durum güncellenemedi", variant: "destructive" })
    }
  }

  // Yeni kategori ekle
  const handleAddCategory = async () => {
    if (!addForm.name.trim()) {
      toast({ title: "Hata", description: "Kategori adı zorunludur", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        name: addForm.name.trim(),
        isActive: addForm.isActive,
      }
      if (addForm.parentId !== 'none') payload.parentId = addForm.parentId
      if (addForm.metaTitle.trim()) payload.metaTitle = addForm.metaTitle.trim()
      if (addForm.metaDescription.trim()) payload.metaDescription = addForm.metaDescription.trim()

      await categoryService.create(payload)
      toast({ title: "Başarılı", description: "Kategori oluşturuldu" })
      setAddModal({ open: false, parentId: null })
      setAddForm({ name: '', parentId: 'none', isActive: true, metaTitle: '', metaDescription: '' })
      fetchCategories()
    } catch {
      toast({ title: "Hata", description: "Kategori oluşturulamadı", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Kategori düzenle
  const handleEditCategory = async () => {
    if (!editModal.category) return
    if (!editForm.name.trim()) {
      toast({ title: "Hata", description: "Kategori adı zorunludur", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        name: editForm.name.trim(),
        isActive: editForm.isActive,
        parentId: editForm.parentId === 'none' ? null : editForm.parentId,
        metaTitle: editForm.metaTitle.trim() || null,
        metaDescription: editForm.metaDescription.trim() || null,
      }

      await categoryService.update(editModal.category.id, payload)
      toast({ title: "Başarılı", description: "Kategori güncellendi" })
      setEditModal({ open: false, category: null })
      fetchCategories()
    } catch {
      toast({ title: "Hata", description: "Kategori güncellenemedi", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Kategori sil
  const handleDeleteCategory = async () => {
    if (!deleteModal.categoryId) return
    setSaving(true)
    try {
      await categoryService.delete(deleteModal.categoryId)
      toast({ title: "Başarılı", description: "Kategori silindi" })
      setDeleteModal({ open: false, categoryId: null })
      fetchCategories()
    } catch {
      toast({ title: "Hata", description: "Kategori silinemedi", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Kategori satırını render et
  const renderCategoryRow = (category: Category, depth = 0): React.ReactNode => {
    const isExpanded = expandedCategories.has(category.id)
    const hasChildren = category.children && category.children.length > 0
    const indent = depth * 32

    return (
      <React.Fragment key={category.id}>
        <TableRow
          className="border-b dark:border-gray-700 hover:bg-blue-50/30 dark:hover:bg-gray-700/50 transition-colors"
        >
          <TableCell className="py-2 h-12">
            <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(category.id)}
                  className="mr-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded p-1 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              ) : (
                <div className="w-7 mr-2" />
              )}
              {hasChildren ? (
                <FolderOpen className="h-4 w-4 text-amber-500 mr-2" />
              ) : (
                <Tag className="h-4 w-4 text-blue-500 mr-2" />
              )}
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {category.name}
              </span>
            </div>
          </TableCell>

          <TableCell className="text-xs text-gray-600 dark:text-gray-400 py-2 h-12">
            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-[10px]">
              /{category.slug}
            </code>
          </TableCell>

          <TableCell className="py-2 h-12 text-center">
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0.5 ${
                category.level === 1
                  ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700"
                  : category.level === 2
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700"
                  : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700"
              }`}
            >
              Seviye {category.level}
            </Badge>
          </TableCell>

          <TableCell className="text-xs text-center text-gray-900 dark:text-gray-100 py-2 h-12">
            {category.productCount}
          </TableCell>

          <TableCell className="py-2 h-12 text-center">
            {category.isActive ? (
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
                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                title="Komisyon Oranları"
                onClick={() => openCommissionModal(category.id)}
              >
                <CircleDollarSign className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-600 hover:text-gray-900 dark:text-gray-100"
                title="Düzenle"
                onClick={() => setEditModal({ open: true, category })}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${
                  category.isActive
                    ? "text-green-600 hover:text-green-700"
                    : "text-red-600 hover:text-red-700"
                }`}
                onClick={() => handleToggleActive(category.id)}
                title={category.isActive ? "Pasif Yap" : "Aktif Yap"}
              >
                {category.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-600 hover:text-red-700 dark:text-red-400"
                title="Sil"
                onClick={() => setDeleteModal({ open: true, categoryId: category.id })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </TableCell>
        </TableRow>

        {/* Alt kategorileri göster */}
        {isExpanded && hasChildren && category.children!.map(child => renderCategoryRow(child, depth + 1))}
      </React.Fragment>
    )
  }

  // İstatistikleri hesapla
  const allCategories = flattenCategories(categories)
  const stats = {
    totalCategories: allCategories.length,
    activeCategories: allCategories.filter(c => c.isActive).length,
    level1: allCategories.filter(c => c.level === 1).length,
    level2: allCategories.filter(c => c.level === 2).length,
    level3: allCategories.filter(c => c.level === 3).length,
    totalProducts: allCategories.reduce((sum, c) => sum + c.productCount, 0),
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-gray-50/50 dark:bg-gray-900">
        {/* İstatistikler */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Toplam Kategori</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalCategories}</p>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-100 dark:border-green-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Aktif Kategori</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-500">{stats.activeCategories}</p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-xl p-4 border border-purple-100 dark:border-purple-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Ana Kategori</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-500">{stats.level1}</p>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Alt Kategori</p>
            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-500">{stats.level2}</p>
          </div>

          <div className="bg-teal-50 dark:bg-teal-950/20 rounded-xl p-4 border border-teal-100 dark:border-teal-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">3. Seviye</p>
            <p className="text-lg font-bold text-teal-600 dark:text-teal-500">{stats.level3}</p>
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
              placeholder="Kategori ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => openCommissionModal(null)}
              className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-shadow"
              size="sm"
            >
              <Percent className="h-4 w-4 mr-2" />
              Toplu Komisyon Güncelle
            </Button>
            <Button
              onClick={() => setAddModal({ open: true, parentId: null })}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-shadow"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kategori
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
                      Kategori Adı
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 w-[200px]">
                      Slug
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 text-center w-[100px]">
                      Seviye
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
                  {filteredCategories ? (
                    // Arama sonuçları - düz liste
                    filteredCategories.map((category) => (
                      <TableRow
                        key={category.id}
                        className="border-b dark:border-gray-700 hover:bg-blue-50/30 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <TableCell className="py-2 h-12">
                          <div className="flex items-center">
                            <Tag className="h-4 w-4 text-blue-500 mr-2" />
                            <div>
                              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                {category.name}
                              </span>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                {category.fullPath}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 dark:text-gray-400 py-2 h-12">
                          <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-[10px]">
                            /{category.slug}
                          </code>
                        </TableCell>
                        <TableCell className="py-2 h-12 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 ${
                              category.level === 1
                                ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700"
                                : category.level === 2
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700"
                                : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700"
                            }`}
                          >
                            Seviye {category.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center text-gray-900 dark:text-gray-100 py-2 h-12">
                          {category.productCount}
                        </TableCell>
                        <TableCell className="py-2 h-12 text-center">
                          {category.isActive ? (
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
                              onClick={() => setEditModal({ open: true, category })}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    // Hiyerarşik görünüm
                    categories.map(category => renderCategoryRow(category))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add Category Sheet */}
        <Sheet open={addModal.open} onOpenChange={(open) => {
          if (!open) {
            setAddModal({ open: false, parentId: null })
            setAddForm({ name: '', parentId: 'none', isActive: true, metaTitle: '', metaDescription: '' })
          }
        }}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Yeni Kategori Ekle</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 p-6">
              {/* Kategori Bilgileri */}
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                  Kategori Bilgileri
                </h3>

                <div className="space-y-3">
                  <Label htmlFor="add-name" className="text-xs">Kategori Adı</Label>
                  <Input
                    id="add-name"
                    value={addForm.name}
                    onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                    className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    placeholder="Kategori adını girin"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="add-parent" className="text-xs">Üst Kategori</Label>
                  <Select value={addForm.parentId} onValueChange={(value) => setAddForm(prev => ({ ...prev, parentId: value }))}>
                    <SelectTrigger className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600">
                      <SelectValue placeholder="Üst kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ana Kategori</SelectItem>
                      {flattenCategories(categories)
                        .filter(c => c.level < 3)
                        .map(cat => (
                          <SelectItem key={cat.id} value={cat.id} className="text-xs">
                            {"—".repeat(cat.level - 1)} {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <Label htmlFor="add-active" className="text-xs font-medium">Kategori Durumu</Label>
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
                          toast({ title: "Uyarı", description: "Önce kategori adını girin", variant: "destructive" })
                          return
                        }
                        setAiGenerating('add-meta')
                        try {
                          const result = await aiService.generateCategoryMeta(addForm.name)
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
                          toast({ title: "Uyarı", description: "Önce kategori adını girin", variant: "destructive" })
                          return
                        }
                        setAiGenerating('add-meta')
                        try {
                          const result = await aiService.generateCategoryMeta(addForm.name)
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
                  onClick={() => {
                    setAddModal({ open: false, parentId: null })
                    setAddForm({ name: '', parentId: 'none', isActive: true, metaTitle: '', metaDescription: '' })
                  }}
                  className="flex-1 h-10"
                  disabled={saving}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleAddCategory}
                  disabled={saving}
                  className="flex-1 h-10 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transition-shadow"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Edit Category Sheet */}
        <Sheet open={editModal.open} onOpenChange={(open) => { if (!open) setEditModal({ open: false, category: null }) }}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Kategori Düzenle</SheetTitle>
            </SheetHeader>
            {editModal.category && (
              <div className="space-y-6 p-6">
                {/* Kategori Bilgileri */}
                <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                    Kategori Bilgileri
                  </h3>

                  <div className="space-y-3">
                    <Label htmlFor="edit-name" className="text-xs">Kategori Adı</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                      placeholder="Kategori adını girin"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="edit-parent" className="text-xs">Üst Kategori</Label>
                    <Select value={editForm.parentId} onValueChange={(value) => setEditForm(prev => ({ ...prev, parentId: value }))}>
                      <SelectTrigger className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600">
                        <SelectValue placeholder="Üst kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ana Kategori</SelectItem>
                        {flattenCategories(categories)
                          .filter(c => c.id !== editModal.category?.id && c.level < 3)
                          .map(cat => (
                            <SelectItem key={cat.id} value={cat.id} className="text-xs">
                              {"—".repeat(cat.level - 1)} {cat.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-4">
                    <Label htmlFor="edit-active" className="text-xs font-medium">Kategori Durumu</Label>
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
                            toast({ title: "Uyarı", description: "Kategori adı boş", variant: "destructive" })
                            return
                          }
                          setAiGenerating('edit-meta')
                          try {
                            const result = await aiService.generateCategoryMeta(editForm.name)
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
                            toast({ title: "Uyarı", description: "Kategori adı boş", variant: "destructive" })
                            return
                          }
                          setAiGenerating('edit-meta')
                          try {
                            const result = await aiService.generateCategoryMeta(editForm.name)
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
                    onClick={() => setEditModal({ open: false, category: null })}
                    className="flex-1 h-10"
                    disabled={saving}
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={handleEditCategory}
                    disabled={saving}
                    className="flex-1 h-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Güncelleniyor..." : "Güncelle"}
                  </Button>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Commission Rates Sheet */}
        <Sheet open={commissionModal.open} onOpenChange={(open) => { if (!open) setCommissionModal({ open: false, categoryId: null }) }}>
          <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Komisyon Oranları</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 p-6">
              <div className="space-y-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-cyan-950/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 rounded-lg">
                    <Percent className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {commissionData?.categoryName
                        ? `${commissionData.categoryName} — Komisyon Oranları`
                        : "Toplu Komisyon Güncelleme"}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Maliyet aralıklarına göre brüt kâr oranlarını belirleyin
                    </p>
                  </div>
                </div>
              </div>

              {commissionLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-sm text-gray-500">Yükleniyor...</div>
                </div>
              ) : commissionData ? (
                <>
                  {/* Marketplace Oranları */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Marketplace Oranları
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {([
                        { key: "sopyo" as const, label: "Sopyo" },
                        { key: "n11" as const, label: "N11" },
                        { key: "trendyol" as const, label: "Trendyol" },
                        { key: "hepsiburada" as const, label: "Hepsiburada" },
                        { key: "pazarama" as const, label: "Pazarama" },
                      ]).map((mp) => (
                        <div key={mp.key} className="space-y-1">
                          <Label className="text-[10px] text-gray-500 dark:text-gray-400">{mp.label}</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={commissionMarketplace[mp.key]}
                              onChange={(e) => setCommissionMarketplace((prev) => ({ ...prev, [mp.key]: parseInt(e.target.value) || 0 }))}
                              className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 pr-8"
                              placeholder="0"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Commission Rate Tiers */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Brüt Kâr Oranları (Kademe)
                    </h4>
                    {commissionData.tiers.map((tier, index) => {
                      const tierState = commissionTiers.find((t) => t.tierId === tier.tierId)
                      return (
                        <div
                          key={tier.tierId}
                          className="grid grid-cols-12 gap-3 items-center p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                        >
                          <div className="col-span-1">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                {index + 1}
                              </span>
                            </div>
                          </div>

                          <div className="col-span-4">
                            <Label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5 block">
                              Başlangıç
                            </Label>
                            <div className="relative">
                              <Input
                                type="number"
                                value={tier.minPrice}
                                readOnly
                                className="text-xs bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 pr-8 cursor-not-allowed"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">₺</span>
                            </div>
                          </div>

                          <div className="col-span-4">
                            <Label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5 block">
                              Bitiş
                            </Label>
                            <div className="relative">
                              <Input
                                type="number"
                                value={tier.maxPrice}
                                readOnly
                                className="text-xs bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 pr-8 cursor-not-allowed"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">₺</span>
                            </div>
                          </div>

                          <div className="col-span-3">
                            <Label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5 block">
                              Brüt Kâr
                            </Label>
                            <div className="relative">
                              <Input
                                type="number"
                                value={tierState?.rate ?? 0}
                                onChange={(e) => {
                                  const newRate = parseInt(e.target.value) || 0
                                  setCommissionTiers((prev) =>
                                    prev.map((t) => t.tierId === tier.tierId ? { ...t, rate: newRate } : t)
                                  )
                                }}
                                className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 pr-8"
                                placeholder="0"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">%</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : null}

              {/* Butonlar */}
              <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setCommissionModal({ open: false, categoryId: null })}
                  className="flex-1 h-10"
                  disabled={commissionSaving}
                >
                  İptal
                </Button>
                <Button
                  className="flex-1 h-10 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 shadow-md hover:shadow-lg transition-shadow"
                  onClick={saveCommissions}
                  disabled={commissionLoading || commissionSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {commissionSaving ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div>
            <span>Toplam {stats.totalCategories} kategori bulunmaktadır.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled className="bg-white dark:bg-gray-800">
              &lt; Önceki
            </Button>
            <span className="px-3 py-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded">1</span>
            <Button variant="outline" size="sm" disabled className="bg-white dark:bg-gray-800">
              Sonraki &gt;
            </Button>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
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

        {/* Delete Modal */}
        <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open, categoryId: null })}>
          <DialogContent className="sm:max-w-md">
            {(() => {
              const deleteCat = deleteModal.categoryId
                ? flattenCategories(categories).find(c => c.id === deleteModal.categoryId)
                : null
              const hasChildren = deleteCat?.children && deleteCat.children.length > 0
              const hasProducts = (deleteCat?.productCount || 0) > 0
              const canDelete = !hasChildren && !hasProducts

              return canDelete ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                      <Trash2 className="h-5 w-5" />
                      Kategori Sil
                    </DialogTitle>
                    <DialogDescription asChild>
                      <div className="pt-4 space-y-4 text-sm">
                        <p className="text-gray-900 dark:text-gray-100">
                          <strong>{deleteCat?.name}</strong> kategorisini silmek istediğinize emin misiniz?
                        </p>
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                          <p className="text-xs text-red-800 dark:text-red-200">
                            Bu işlem geri alınamaz.
                          </p>
                        </div>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="flex gap-2 sm:gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteModal({ open: false, categoryId: null })}
                      className="flex-1"
                      disabled={saving}
                    >
                      İptal
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteCategory}
                      className="flex-1"
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {saving ? "Siliniyor..." : "Sil"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                      <Trash2 className="h-5 w-5" />
                      Kategori Silinemez
                    </DialogTitle>
                    <DialogDescription asChild>
                      <div className="pt-4 space-y-4 text-sm">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          Bu kategori silinemez!
                        </p>

                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                          <div className="flex items-start gap-2">
                            <div className="space-y-2 flex-1">
                              {hasChildren && (
                                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                  Bu kategoriye bağlı alt kategoriler var
                                </p>
                              )}
                              {hasProducts && (
                                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                  Bu kategoriye bağlı ürünler var
                                </p>
                              )}
                              <p className="text-xs text-amber-800 dark:text-amber-300">
                                {hasChildren
                                  ? "Kategoriyi silebilmek için önce alt kategorileri taşıyın veya silin."
                                  : "Kategoriyi silebilmek için öncelikle bu kategoriye bağlı tüm ürünlerin kategorilerini değiştirmeniz gerekmektedir."}
                              </p>
                            </div>
                          </div>

                          {hasProducts && (
                            <div className="bg-white dark:bg-gray-900 rounded-md p-3 border border-amber-200 dark:border-amber-800">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  Bu kategorideki ürün sayısı:
                                </span>
                                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                                  {deleteCat?.productCount || 0} Ürün
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            <strong>İpucu:</strong> {hasChildren ? "Alt kategorileri yönetmek için ilgili kategoriye gidin." : "Ürünlerin kategorilerini değiştirmek için \"Ürün Listesi\" sayfasına gidin."}
                          </p>
                        </div>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteModal({ open: false, categoryId: null })}
                      className="w-full"
                    >
                      Anladım
                    </Button>
                  </DialogFooter>
                </>
              )
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
