"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
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
import {
  Search, Edit, Trash2, Image as ImageIcon, Lock, Unlock, Loader2, RefreshCw, Package,
} from "lucide-react"
import { productService, supplierService } from "@/lib/api"
import type { Product } from "@/lib/api/types"
import { useToast } from "@/hooks/use-toast"

export default function InventoryPage() {
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)

  const [search, setSearch] = useState("")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [stockStatusFilter, setStockStatusFilter] = useState("all")

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [stockFilter, setStockFilter] = useState<"all" | "critical" | "out">("all")
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; productId: string | null }>({ open: false, productId: null })

  useEffect(() => {
    supplierService.getAll().then(res => {
      if (res.success && res.data) setSuppliers(res.data.map((s: any) => ({ id: s.id, name: s.name })))
    }).catch(() => {})
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const filters: Record<string, any> = { page, limit }
      if (search) filters.search = search
      if (supplierFilter !== "all") filters.supplier = supplierFilter
      if (stockStatusFilter === "in-stock") filters.stockStatus = "in_stock"
      if (stockStatusFilter === "out-of-stock") filters.stockStatus = "out_of_stock"

      const res = await productService.getAll(filters)
      if (res.success) {
        setProducts(res.data)
        setTotal(res.pagination?.total || 0)
        setTotalPages(res.pagination?.totalPages || 1)
      }
    } catch {
      toast({ title: "Hata", description: "Envanter yüklenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, supplierFilter, stockStatusFilter, toast])

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300)
    return () => clearTimeout(t)
  }, [fetchProducts])

  const handleToggleEticaret = async (id: string, current: boolean) => {
    try {
      // Hem eticaret hem send_eticaret_check'i senkronize et
      await productService.update(id, { eticaret: !current, sendEticaretCheck: !current } as any)
      setProducts(prev => prev.map(p => p.id === id ? { ...p, eticaret: !current, sendEticaretCheck: !current, isActive: !current } : p))
    } catch {
      toast({ title: "Hata", description: "Durum güncellenemedi", variant: "destructive" })
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      await productService.update(id, { toplamStock: 0, eticaret: false, sopyo: false })
      toast({ title: "Başarılı", description: "Ürün pasife alındı" })
      fetchProducts()
    } catch {
      toast({ title: "Hata", description: "İşlem başarısız", variant: "destructive" })
    }
    setDeleteModal({ open: false, productId: null })
  }

  const stats = {
    total,
    totalStock: products.reduce((s, p) => s + (p.toplamStock || 0), 0),
    stockValue: products.reduce((s, p) => s + ((p.toplamStock || 0) * (p.tedarikciFiyat || 0)), 0),
    critical: products.filter(p => (p.toplamStock || 0) > 0 && (p.toplamStock || 0) <= 5).length,
    outOfStock: products.filter(p => !p.toplamStock || p.toplamStock === 0).length,
  }

  const getFirstImage = (p: Product) => p.images?.[0] || null

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-gray-50/50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Envanter</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Envantere alınmış ürünler — stok ve fiyat yönetimi</p>
          </div>
          <Button variant="outline" size="sm" className="bg-white" onClick={fetchProducts}>
            <RefreshCw className="h-4 w-4 mr-2" /> Yenile
          </Button>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button onClick={() => { setStockFilter("all"); setStockStatusFilter("all") }}
            className={`bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border text-left transition-all ${stockFilter === "all" ? "border-blue-400 ring-2 ring-blue-400/50" : "border-blue-100 hover:border-blue-300"}`}>
            <p className="text-xs text-gray-500 mb-2">Toplam Ürün</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </button>
          <div className="bg-violet-50 dark:bg-violet-950/20 rounded-xl p-4 border border-violet-100">
            <p className="text-xs text-gray-500 mb-2">Toplam Stok</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.totalStock.toLocaleString("tr-TR")}</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4 border border-orange-100">
            <p className="text-xs text-gray-500 mb-2">Stok Değeri</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">₺{stats.stockValue.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</p>
          </div>
          <button onClick={() => { setStockFilter("critical"); setStockStatusFilter("all") }}
            className={`bg-amber-50 dark:bg-amber-950/20 rounded-xl p-4 border text-left transition-all relative ${stockFilter === "critical" ? "border-amber-400 ring-2 ring-amber-400/50" : "border-amber-200 hover:border-amber-300"}`}>
            {stats.critical > 0 && <div className="absolute top-2 right-2"><div className="relative flex h-3 w-3"><div className="animate-ping absolute h-full w-full rounded-full bg-amber-400 opacity-75"></div><div className="relative rounded-full h-3 w-3 bg-amber-500"></div></div></div>}
            <p className="text-xs text-gray-500 mb-2">Kritik Stok</p>
            <p className={`text-lg font-bold text-amber-600 ${stats.critical > 0 ? "animate-pulse" : ""}`}>{stats.critical}</p>
          </button>
          <button onClick={() => { setStockFilter("out"); setStockStatusFilter("out-of-stock") }}
            className={`bg-red-50 dark:bg-red-950/20 rounded-xl p-4 border text-left transition-all relative ${stockFilter === "out" ? "border-red-400 ring-2 ring-red-400/50" : "border-red-200 hover:border-red-300"}`}>
            {stats.outOfStock > 0 && <div className="absolute top-2 right-2"><div className="relative flex h-3 w-3"><div className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75"></div><div className="relative rounded-full h-3 w-3 bg-red-500"></div></div></div>}
            <p className="text-xs text-gray-500 mb-2">Stok Bitti</p>
            <p className={`text-lg font-bold text-red-600 ${stats.outOfStock > 0 ? "animate-pulse" : ""}`}>{stats.outOfStock}</p>
          </button>
        </div>

        {/* Filtreler */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Ürün, barkod, stok kodu..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-10 h-9 bg-white text-xs" />
          </div>
          <Select value={supplierFilter} onValueChange={(v) => { setSupplierFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[150px] h-9 bg-white text-xs"><SelectValue placeholder="Tedarikçi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Tedarikçiler</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stockStatusFilter} onValueChange={(v) => { setStockStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[130px] h-9 bg-white text-xs"><SelectValue placeholder="Stok" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Stoklar</SelectItem>
              <SelectItem value="in-stock">Stokta Var</SelectItem>
              <SelectItem value="out-of-stock">Stokta Yok</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{totalPages} sayfanın {page}. sayfası — {total.toLocaleString("tr-TR")} kayıt</span>
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

        <Card className="shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Package className="h-12 w-12 mb-3 text-gray-300" />
                <p className="font-medium">Envanterde ürün yok</p>
                <p className="text-sm mt-1">Ürünler sayfasından envantere ürün ekleyin</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white dark:bg-gray-900">
                      <TableHead className="text-xs w-[50px]">ID</TableHead>
                      <TableHead className="text-xs w-[45px]"></TableHead>
                      <TableHead className="text-xs w-[250px]">Ürün</TableHead>
                      <TableHead className="text-xs w-[100px]">Tedarikçi</TableHead>
                      <TableHead className="text-xs w-[70px]">Durum</TableHead>
                      <TableHead className="text-xs w-[60px]">Stok</TableHead>
                      <TableHead className="text-xs w-[90px]">Alış</TableHead>
                      <TableHead className="text-xs w-[90px]">BBB Fiyat</TableHead>
                      <TableHead className="text-xs w-[90px]">Barkod</TableHead>
                      <TableHead className="text-xs w-[100px] text-center">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p, i) => (
                      <TableRow key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <TableCell className="text-xs font-medium">#{p.id}</TableCell>
                        <TableCell>
                          {getFirstImage(p) ? (
                            <img src={getFirstImage(p)!} alt="" className="w-[40px] h-[40px] object-cover rounded border" onError={(e) => { e.currentTarget.style.display = "none" }} />
                          ) : <ImageIcon className="h-4 w-4 text-gray-300" />}
                        </TableCell>
                        <TableCell>
                          <Link href={`/products/edit/${p.id}`} className="text-xs font-medium text-gray-900 hover:text-blue-600 line-clamp-2 leading-tight">{p.name}</Link>
                          {p.stockCode && <p className="text-[10px] text-gray-400 mt-0.5">{p.stockCode}</p>}
                        </TableCell>
                        <TableCell className="text-xs">{p.supplier || "-"}</TableCell>
                        <TableCell>
                          {p.isActive
                            ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300">Aktif</Badge>
                            : <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 border-red-300">Pasif</Badge>}
                        </TableCell>
                        <TableCell className={`text-xs font-medium ${(p.toplamStock || 0) >= 5 ? "text-green-600" : (p.toplamStock || 0) > 0 ? "text-yellow-600" : "text-red-600"}`}>{p.toplamStock ?? 0}</TableCell>
                        <TableCell className="text-xs">{p.tedarikciFiyat != null ? `₺${p.tedarikciFiyat.toLocaleString("tr-TR")}` : "-"}</TableCell>
                        <TableCell className="text-xs font-semibold">{p.bolbolbulFiyat != null ? `₺${p.bolbolbulFiyat.toLocaleString("tr-TR")}` : "-"}</TableCell>
                        <TableCell className="text-xs text-gray-500">{p.barcode || "-"}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Link href={`/products/edit/${p.id}`}><Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button></Link>
                            <Button variant="ghost" size="icon" className={`h-7 w-7 ${p.isActive ? "text-green-600" : "text-red-600"}`} onClick={() => handleToggleEticaret(p.id, p.isActive)}>
                              {p.isActive ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => setDeleteModal({ open: true, productId: p.id })}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pasife Çekme Modalı */}
        <Dialog open={deleteModal.open} onOpenChange={(o) => setDeleteModal({ open: o, productId: o ? deleteModal.productId : null })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="h-5 w-5" />Ürünü Pasife Çek</DialogTitle>
              <DialogDescription asChild>
                <div className="pt-4 space-y-2 text-sm">
                  <ul className="space-y-1.5 pl-4">
                    <li className="flex items-start gap-2"><span className="text-red-500">•</span>Stok <strong className="text-red-600">sıfırlanacak</strong></li>
                    <li className="flex items-start gap-2"><span className="text-red-500">•</span>Envanter <strong className="text-red-600">pasif</strong>e çekilecek</li>
                    <li className="flex items-start gap-2"><span className="text-amber-500">•</span>XML güncellemeleri <strong className="text-amber-600">duracak</strong></li>
                  </ul>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteModal({ open: false, productId: null })}>İptal</Button>
              <Button variant="destructive" onClick={() => deleteModal.productId && handleDeactivate(deleteModal.productId)}>
                <Trash2 className="h-4 w-4 mr-2" />Pasife Çek
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
