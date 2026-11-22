"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Search, Image as ImageIcon, Loader2, RefreshCw, PackagePlus, Boxes, X,
} from "lucide-react"
import {
  supplierProductService, supplierService, categoryService, desiService,
} from "@/lib/api"
import type { SupplierProductDTO } from "@/lib/api/supplier-product.service"
import { useToast } from "@/hooks/use-toast"

function flattenCategoryTree(nodes: any[], depth = 0): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = []
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth })
    if (node.children?.length) result.push(...flattenCategoryTree(node.children, depth + 1))
  }
  return result
}

export default function ProductsPage() {
  const router = useRouter()
  const { toast } = useToast()

  // Data
  const [products, setProducts] = useState<SupplierProductDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [search, setSearch] = useState("")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [envanterFilter, setEnvanterFilter] = useState("all") // all | 0 | 1
  const [stockFilter, setStockFilter] = useState("all") // all | in_stock | out_of_stock

  // Master data
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string; depth: number }[]>([])
  const [desiList, setDesiList] = useState<{ id: string; name: string; price: number }[]>([])

  // Add to inventory modal
  const [addModal, setAddModal] = useState<{ open: boolean; product: SupplierProductDTO | null }>({ open: false, product: null })
  const [addForm, setAddForm] = useState({ categoryId: "", desi: "", kdv: "20", brand: "", barcode: "" })
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      supplierService.getAll(),
      categoryService.getTree(),
      desiService.getAll(),
    ]).then(([supRes, catRes, desiRes]) => {
      if (supRes.success && supRes.data) setSuppliers(supRes.data.map((s: any) => ({ id: s.id, name: s.name })))
      if (catRes.success && catRes.data) setCategories(flattenCategoryTree(catRes.data))
      if (desiRes.success && desiRes.data) setDesiList(desiRes.data)
    }).catch(() => {})
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const filters: Record<string, any> = { page, limit }
      if (search) filters.search = search
      if (supplierFilter !== "all") filters.supplier = supplierFilter
      if (envanterFilter !== "all") filters.envanterStatus = envanterFilter
      if (stockFilter === "in_stock") filters.stockStatus = "in_stock"
      if (stockFilter === "out_of_stock") filters.stockStatus = "out_of_stock"

      const res = await supplierProductService.getAll(filters)
      if (res.success) {
        setProducts(res.data)
        setTotal(res.pagination?.total || 0)
        setTotalPages(res.pagination?.totalPages || 1)
      }
    } catch {
      toast({ title: "Hata", description: "Ürünler yüklenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, supplierFilter, envanterFilter, stockFilter, toast])

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300)
    return () => clearTimeout(t)
  }, [fetchProducts])

  const handleAddToInventory = async () => {
    if (!addModal.product || !addForm.categoryId) return
    setAddLoading(true)
    try {
      await supplierProductService.addToInventory(addModal.product.id, {
        categoryId: addForm.categoryId,
        desi: addForm.desi ? parseFloat(addForm.desi) : undefined,
        kdv: parseInt(addForm.kdv),
        brand: addForm.brand || undefined,
        barcode: addForm.barcode || undefined,
      })
      toast({ title: "Başarılı", description: "Ürün envantere eklendi" })
      setAddModal({ open: false, product: null })
      setAddForm({ categoryId: "", desi: "", kdv: "20", brand: "", barcode: "" })
      fetchProducts()
    } catch {
      toast({ title: "Hata", description: "Envantere eklenemedi", variant: "destructive" })
    } finally {
      setAddLoading(false)
    }
  }

  // Stats (sadece görünen sayfa için)
  const inInventoryCount = products.filter(p => p.envanterStatus).length
  const outOfStockCount = products.filter(p => !p.stock || p.stock === 0).length

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-gray-50/50 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ürünler</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tedarikçilerden gelen tüm ürünler — envantere eklenmiş veya eklenmemiş</p>
          </div>
          <Button variant="outline" size="sm" className="bg-white" onClick={fetchProducts}>
            <RefreshCw className="h-4 w-4 mr-2" /> Yenile
          </Button>
        </div>

        {/* Quick stats — tıklanabilir filtreler */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => { setEnvanterFilter("all"); setStockFilter("all"); setPage(1) }}
            className={`bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border text-left transition-all ${envanterFilter === "all" && stockFilter === "all" ? "border-blue-400 ring-2 ring-blue-400/50" : "border-blue-100 hover:border-blue-300"}`}>
            <p className="text-xs text-gray-500 mb-2">Toplam Ürün</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{total.toLocaleString("tr-TR")}</p>
          </button>
          <button
            onClick={() => { setEnvanterFilter("1"); setStockFilter("all"); setPage(1) }}
            className={`bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border text-left transition-all ${envanterFilter === "1" ? "border-green-400 ring-2 ring-green-400/50" : "border-green-100 hover:border-green-300"}`}>
            <p className="text-xs text-gray-500 mb-2">Envantere Eklenmiş</p>
            <p className="text-lg font-bold text-green-700">{inInventoryCount}<span className="text-xs text-gray-400 ml-1">/ sayfa</span></p>
          </button>
          <button
            onClick={() => { setEnvanterFilter("0"); setStockFilter("all"); setPage(1) }}
            className={`bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 border text-left transition-all ${envanterFilter === "0" ? "border-amber-400 ring-2 ring-amber-400/50" : "border-amber-200 hover:border-amber-300"}`}>
            <p className="text-xs text-gray-500 mb-2">Henüz Eklenmemiş</p>
            <p className="text-lg font-bold text-amber-700">{products.length - inInventoryCount}<span className="text-xs text-gray-400 ml-1">/ sayfa</span></p>
          </button>
          <button
            onClick={() => { setStockFilter("out_of_stock"); setEnvanterFilter("all"); setPage(1) }}
            className={`bg-red-50 dark:bg-red-950/20 rounded-xl p-4 border text-left transition-all ${stockFilter === "out_of_stock" ? "border-red-400 ring-2 ring-red-400/50" : "border-red-200 hover:border-red-300"}`}>
            <p className="text-xs text-gray-500 mb-2">Stoksuz</p>
            <p className="text-lg font-bold text-red-700">{outOfStockCount}<span className="text-xs text-gray-400 ml-1">/ sayfa</span></p>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Ürün adı, kod veya marka ara..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-10 h-9 bg-white text-xs" />
          </div>
          <Select value={supplierFilter} onValueChange={(v) => { setSupplierFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[150px] h-9 bg-white text-xs"><SelectValue placeholder="Tedarikçi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Tedarikçiler</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={envanterFilter} onValueChange={(v) => { setEnvanterFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[160px] h-9 bg-white text-xs"><SelectValue placeholder="Envanter" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Ürünler</SelectItem>
              <SelectItem value="0">Envantere Eklenmemiş</SelectItem>
              <SelectItem value="1">Envantere Eklenmiş</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[130px] h-9 bg-white text-xs"><SelectValue placeholder="Stok" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Stoklar</SelectItem>
              <SelectItem value="in_stock">Stokta Var</SelectItem>
              <SelectItem value="out_of_stock">Stokta Yok</SelectItem>
            </SelectContent>
          </Select>
          {(search || supplierFilter !== "all" || envanterFilter !== "all" || stockFilter !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSupplierFilter("all"); setEnvanterFilter("all"); setStockFilter("all"); setPage(1) }} className="h-9 text-xs">
              <X className="h-3.5 w-3.5 mr-1" /> Temizle
            </Button>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{totalPages} sayfanın {page}. sayfası — {total.toLocaleString("tr-TR")} ürün</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="bg-white">&lt; Önceki</Button>
            <span className="px-3 py-1 bg-white border rounded">{page}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="bg-white">Sonraki &gt;</Button>
            <Select value={String(limit)} onValueChange={(v) => { setLimit(parseInt(v)); setPage(1) }}>
              <SelectTrigger className="w-20 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Boxes className="h-12 w-12 mb-3 text-gray-300" />
                <p className="font-medium">Ürün bulunamadı</p>
                <p className="text-sm mt-1">Filtreleri değiştirmeyi deneyin veya tedarikçi sync yapın</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white dark:bg-gray-900">
                      <TableHead className="text-xs w-[60px]">ID</TableHead>
                      <TableHead className="text-xs w-[280px]">Ürün</TableHead>
                      <TableHead className="text-xs w-[110px]">Tedarikçi</TableHead>
                      <TableHead className="text-xs w-[120px]">Ürün Kodu</TableHead>
                      <TableHead className="text-xs w-[100px]">Stok</TableHead>
                      <TableHead className="text-xs w-[100px]">Fiyat (KDV)</TableHead>
                      <TableHead className="text-xs w-[100px]">Marka</TableHead>
                      <TableHead className="text-xs w-[100px]">Envanter</TableHead>
                      <TableHead className="text-xs w-[120px] text-center">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p, i) => (
                      <TableRow key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <TableCell className="text-xs font-medium">#{p.id}</TableCell>
                        <TableCell className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">{p.productTitle || "-"}</TableCell>
                        <TableCell className="text-xs">{p.supplierName || "-"}</TableCell>
                        <TableCell className="text-xs text-gray-500 font-mono">{p.productCode || "-"}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium ${(p.stock || 0) > 0 ? "text-green-600" : "text-red-600"}`}>
                            {p.stock ?? 0}
                          </span>
                          {p.productStockStatus && (
                            <span className="text-[10px] text-gray-400 ml-1">({p.productStockStatus})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{p.netPriceWithVAT != null ? `₺${p.netPriceWithVAT.toLocaleString("tr-TR")}` : "-"}</TableCell>
                        <TableCell className="text-xs">{p.brand || "-"}</TableCell>
                        <TableCell>
                          {p.envanterStatus
                            ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300">Eklendi</Badge>
                            : <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-500 border-gray-300">Eklenmedi</Badge>}
                        </TableCell>
                        <TableCell className="text-center">
                          {!p.envanterStatus ? (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => router.push(`/products/edit/new?supplierProductId=${p.id}`)}
                            >
                              <PackagePlus className="h-3.5 w-3.5 mr-1" />
                              Ekle
                            </Button>
                          ) : (
                            <span className="text-[10px] text-gray-400">Envanterde</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Envantere Ekleme Modalı */}
        <Dialog open={addModal.open} onOpenChange={(o) => setAddModal({ open: o, product: o ? addModal.product : null })}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-blue-600" />
                Envantere Ekle
              </DialogTitle>
              <DialogDescription>
                {addModal.product?.productTitle}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
                <div>Tedarikçi: <strong>{addModal.product?.supplierName}</strong></div>
                <div>Fiyat: <strong>₺{addModal.product?.netPriceWithVAT?.toLocaleString("tr-TR")}</strong></div>
                <div>Stok: <strong>{addModal.product?.stock}</strong></div>
                <div>Kod: <strong>{addModal.product?.productCode}</strong></div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Kategori *</Label>
                  <Select value={addForm.categoryId} onValueChange={(v) => setAddForm(f => ({ ...f, categoryId: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Kategori seçin" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {"—".repeat(c.depth)} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Desi</Label>
                    <Select value={addForm.desi} onValueChange={(v) => setAddForm(f => ({ ...f, desi: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Desi seçin" /></SelectTrigger>
                      <SelectContent>
                        {desiList.map(d => (
                          <SelectItem key={d.id} value={d.name}>{d.name} — ₺{d.price}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">KDV</Label>
                    <Select value={addForm.kdv} onValueChange={(v) => setAddForm(f => ({ ...f, kdv: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">%10</SelectItem>
                        <SelectItem value="20">%20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Marka</Label>
                    <Input value={addForm.brand} onChange={(e) => setAddForm(f => ({ ...f, brand: e.target.value }))} className="mt-1" placeholder="Marka" />
                  </div>
                  <div>
                    <Label className="text-xs">Barkod</Label>
                    <Input value={addForm.barcode} onChange={(e) => setAddForm(f => ({ ...f, barcode: e.target.value }))} className="mt-1" placeholder="Barkod" />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddModal({ open: false, product: null })}>İptal</Button>
              <Button onClick={handleAddToInventory} disabled={!addForm.categoryId || addLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {addLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PackagePlus className="h-4 w-4 mr-2" />}
                Envantere Ekle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
