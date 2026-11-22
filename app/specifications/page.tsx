"use client"

import React, { useState, useEffect, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { specificationService } from "@/lib/api"
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
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Tag,
  Eye,
  EyeOff,
  Save,
  Settings,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

// Teknik Özellik tipi
type Specification = {
  id: string
  name: string
  groupId: string | null
  isGroup: boolean
  isActive: boolean
  order: number
  productCount: number
  children?: Specification[]
}

// Boş başlangıç — API'den yüklenecek

export default function SpecificationsPage() {
  const { toast } = useToast()
  const [specifications, setSpecifications] = useState<Specification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [editModal, setEditModal] = useState<{ open: boolean; spec: Specification | null }>({ open: false, spec: null })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; specId: string | null }>({ open: false, specId: null })
  const [addModal, setAddModal] = useState<{ open: boolean; parentId: string | null }>({ open: false, parentId: null })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [totalGroupsServer, setTotalGroupsServer] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Debounce: searchTerm değiştikten 350ms sonra API'ye gönder
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350)
    return () => clearTimeout(id)
  }, [searchTerm])

  // Search değişiminde sayfa 1'e dön
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, itemsPerPage])

  const fetchSpecifications = useCallback(async () => {
    try {
      setLoading(true)
      const response = await specificationService.list({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
      })
      if (response.success && response.data) {
        const r = response.data as unknown as { items: Specification[]; total: number }
        setSpecifications(r.items)
        setTotalGroupsServer(r.total)
        // Search yapıldığında bulunan tüm gruplar otomatik aç (children'ı görünsün)
        if (debouncedSearch) {
          setExpandedGroups(new Set(r.items.map(g => g.id)))
        }
      }
    } catch {
      toast({ title: "Hata", description: "Özellikler yüklenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast, currentPage, itemsPerPage, debouncedSearch])

  useEffect(() => {
    fetchSpecifications()
  }, [fetchSpecifications])

  const totalPages = Math.max(1, Math.ceil(totalGroupsServer / itemsPerPage))

  // Grubu genişlet/daralt
  const toggleExpand = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  // Tüm özellikleri düz liste olarak getir
  const flattenSpecs = (specs: Specification[]): Specification[] => {
    let result: Specification[] = []
    specs.forEach(spec => {
      result.push(spec)
      if (spec.children) {
        result = [...result, ...spec.children]
      }
    })
    return result
  }

  // Search artık backend tarafından filtreleniyor, client-side filtre yok
  const filteredSpecs = null as Specification[] | null

  // Özelliği aktif/pasif yap
  const handleToggleActive = (specId: string) => {
    const updateSpecStatus = (specs: Specification[]): Specification[] => {
      return specs.map(spec => {
        if (spec.id === specId) {
          return { ...spec, isActive: !spec.isActive }
        }
        if (spec.children) {
          return { ...spec, children: updateSpecStatus(spec.children) }
        }
        return spec
      })
    }
    setSpecifications(updateSpecStatus(specifications))
  }

  // Özellik satırını render et
  const renderSpecRow = (spec: Specification, depth = 0): React.ReactNode => {
    const isExpanded = expandedGroups.has(spec.id)
    const hasChildren = spec.children && spec.children.length > 0
    const indent = depth * 32

    return (
      <React.Fragment key={spec.id}>
        <TableRow
          className="border-b dark:border-gray-700 hover:bg-blue-50/30 dark:hover:bg-gray-700/50 transition-colors"
        >
          <TableCell className="py-2 h-12">
            <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(spec.id)}
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
                {spec.name}
              </span>
            </div>
          </TableCell>

          <TableCell className="py-2 h-12 text-center">
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0.5 ${
                spec.isGroup
                  ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700"
                  : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700"
              }`}
            >
              {spec.isGroup ? "Grup" : "Özellik"}
            </Badge>
          </TableCell>

          <TableCell className="text-xs text-center text-gray-900 dark:text-gray-100 py-2 h-12">
            {spec.productCount}
          </TableCell>

          <TableCell className="py-2 h-12 text-center">
            {spec.isActive ? (
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
              {spec.isGroup && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  title="Özellik Ekle"
                  onClick={() => setAddModal({ open: true, parentId: spec.id })}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-600 hover:text-gray-900 dark:text-gray-100"
                title="Düzenle"
                onClick={() => setEditModal({ open: true, spec })}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ${
                  spec.isActive
                    ? "text-green-600 hover:text-green-700"
                    : "text-red-600 hover:text-red-700"
                }`}
                onClick={() => handleToggleActive(spec.id)}
                title={spec.isActive ? "Pasif Yap" : "Aktif Yap"}
              >
                {spec.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-600 hover:text-red-700 dark:text-red-400"
                title="Sil"
                onClick={() => setDeleteModal({ open: true, specId: spec.id })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </TableCell>
        </TableRow>

        {/* Alt özellikleri göster */}
        {isExpanded && hasChildren && spec.children!.map(child => renderSpecRow(child, depth + 1))}
      </React.Fragment>
    )
  }

  // İstatistikler — sayfada gösterilenler için (toplam grup serverdan)
  const allSpecs = flattenSpecs(specifications)
  const stats = {
    totalGroups: totalGroupsServer,
    totalSpecs: allSpecs.filter(s => !s.isGroup).length,
    activeSpecs: allSpecs.filter(s => s.isActive).length,
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-gray-50/50 dark:bg-gray-900">
        {/* İstatistikler */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-xl p-4 border border-purple-100 dark:border-purple-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Özellik Grupları</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalGroups}</p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Toplam Özellik</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-500">{stats.totalSpecs}</p>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-100 dark:border-green-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Aktif Özellik</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-500">{stats.activeSpecs}</p>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Teknik özellik ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setAddModal({ open: true, parentId: null })}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-shadow"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Özellik Grubu
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
                      Özellik Adı
                    </TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 text-center w-[100px]">
                      Tip
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
                  {filteredSpecs ? (
                    // Arama sonuçları - düz liste
                    filteredSpecs.map((spec) => (
                      <TableRow
                        key={spec.id}
                        className="border-b dark:border-gray-700 hover:bg-blue-50/30 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <TableCell className="py-2 h-12">
                          <div className="flex items-center">
                            {spec.isGroup ? (
                              <FolderOpen className="h-4 w-4 text-amber-500 mr-2" />
                            ) : (
                              <Tag className="h-4 w-4 text-blue-500 mr-2" />
                            )}
                            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                              {spec.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 h-12 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 ${
                              spec.isGroup
                                ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700"
                                : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700"
                            }`}
                          >
                            {spec.isGroup ? "Grup" : "Özellik"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-center text-gray-900 dark:text-gray-100 py-2 h-12">
                          {spec.productCount}
                        </TableCell>
                        <TableCell className="py-2 h-12 text-center">
                          {spec.isActive ? (
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
                              onClick={() => setEditModal({ open: true, spec })}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    // Hiyerarşik görünüm
                    specifications.map(spec => renderSpecRow(spec))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div>
            {loading ? (
              <span>Yükleniyor...</span>
            ) : (
              <span>
                Toplam <strong className="text-gray-900 dark:text-gray-100">{totalGroupsServer}</strong>{" "}
                grup{debouncedSearch ? ` "${debouncedSearch}" araması için` : ""} bulundu — Sayfa{" "}
                <strong className="text-gray-900 dark:text-gray-100">{currentPage}</strong>/{totalPages}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="bg-white dark:bg-gray-800"
            >
              &lt; Önceki
            </Button>
            <span className="px-3 py-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded text-xs">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="bg-white dark:bg-gray-800"
            >
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

        {/* Add Spec Sheet */}
        <Sheet open={addModal.open} onOpenChange={(open) => setAddModal({ open, parentId: null })}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Yeni Teknik Özellik Ekle</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 p-6">
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                  Teknik Özellik Bilgileri
                </h3>

                <div className="space-y-3">
                  <Label htmlFor="add-name" className="text-xs">Özellik Adı</Label>
                  <Input
                    id="add-name"
                    className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    placeholder="Özellik adını girin"
                  />
                </div>

                {addModal.parentId && (
                  <div className="space-y-3">
                    <Label htmlFor="add-parent" className="text-xs">Özellik Grubu</Label>
                    <Select defaultValue={addModal.parentId || "none"}>
                      <SelectTrigger className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600">
                        <SelectValue placeholder="Grup seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Grup Seçin</SelectItem>
                        {specifications.map(group => (
                          <SelectItem key={group.id} value={group.id} className="text-xs">
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <Label htmlFor="add-active" className="text-xs font-medium">Durum</Label>
                  <Switch
                    id="add-active"
                    defaultChecked={true}
                    className="scale-125 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:via-violet-500 data-[state=checked]:to-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setAddModal({ open: false, parentId: null })}
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

        {/* Edit Spec Sheet */}
        <Sheet open={editModal.open} onOpenChange={(open) => setEditModal({ open, spec: null })}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Teknik Özellik Düzenle</SheetTitle>
            </SheetHeader>
            {editModal.spec && (
              <div className="space-y-6 p-6">
                <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                    Teknik Özellik Bilgileri
                  </h3>

                  <div className="space-y-3">
                    <Label htmlFor="edit-name" className="text-xs">Özellik Adı</Label>
                    <Input
                      id="edit-name"
                      defaultValue={editModal.spec.name}
                      className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                      placeholder="Özellik adını girin"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-4">
                    <Label htmlFor="edit-active" className="text-xs font-medium">Durum</Label>
                    <Switch
                      id="edit-active"
                      defaultChecked={editModal.spec.isActive}
                      className="scale-125 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:via-violet-500 data-[state=checked]:to-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setEditModal({ open: false, spec: null })}
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
        <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open, specId: null })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Teknik Özellik Silinemez
              </DialogTitle>
              <DialogDescription asChild>
                <div className="pt-4 space-y-4 text-sm">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    Bu teknik özellik silinemez!
                  </p>

                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">⚠️</span>
                      <div className="space-y-2 flex-1">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                          Bu teknik özelliği kullanan ürünler var
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          Teknik özelliği silebilmek için öncelikle bu özelliği kullanan tüm ürünlerden bu özelliği kaldırmanız gerekmektedir.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 rounded-md p-3 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Bu özelliği kullanan ürün sayısı:
                        </span>
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                          {deleteModal.specId
                            ? flattenSpecs(specifications).find(s => s.id === deleteModal.specId)?.productCount || 0
                            : 0} Ürün
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      💡 <strong>İpucu:</strong> Ürünlerin teknik özelliklerini düzenlemek için "Ürün Listesi" sayfasına gidin.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ open: false, specId: null })}
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
