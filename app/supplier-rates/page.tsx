"use client"

import React, { useState, useEffect, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { supplierService, tokenRefreshService } from "@/lib/api"
import type { TokenProgress } from "@/lib/api/token-refresh.service"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Percent,
  TrendingUp,
  Building2,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

// Tedarikçi tipi
type Supplier = {
  id: string
  name: string
  discountRate: number // Ek İskonto oranı (%)
  isActive: boolean
  contactPerson: string
  email: string
  phone: string
  token: string         // B2B session/cookie
  tokenUpdatedAt: string | null
  euroKur: number | null
  dolarKur: number | null
  username: string
  password: string
  loginUrl: string
}

// "X saat önce" formatı
function timeAgo(date: string | null): { text: string; color: string } {
  if (!date) return { text: 'Hiç güncellenmedi', color: 'text-gray-400' }
  const ms = Date.now() - new Date(date).getTime()
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return { text: `${sec} sn önce`, color: 'text-green-600' }
  const min = Math.floor(sec / 60)
  if (min < 60) return { text: `${min} dk önce`, color: 'text-green-600' }
  const hr = Math.floor(min / 60)
  if (hr < 6) return { text: `${hr} saat önce`, color: 'text-green-600' }
  if (hr < 24) return { text: `${hr} saat önce`, color: 'text-amber-600' }
  const day = Math.floor(hr / 24)
  if (day < 3) return { text: `${day} gün önce`, color: 'text-amber-600' }
  return { text: `${day} gün önce`, color: 'text-red-600' }
}

// API'den yüklenecek

export default function SupplierRatesPage() {
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editModal, setEditModal] = useState<{ open: boolean; supplier: Supplier | null }>({ open: false, supplier: null })
  const [addModal, setAddModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; supplierId: string | null }>({ open: false, supplierId: null })
  const [tokenProgress, setTokenProgress] = useState<TokenProgress | null>(null)

  // Token refresh progress polling — her 2 saniyede bir kontrol et
  useEffect(() => {
    let mounted = true
    const tick = async () => {
      try {
        const r = await tokenRefreshService.getStatus()
        if (mounted && r.success && r.data) setTokenProgress(r.data)
      } catch {}
    }
    tick()
    const interval = setInterval(tick, 2000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  // Refresh bittiğinde supplier listesini yenile (tokenUpdatedAt için)
  const prevRunningRef = React.useRef(false)
  useEffect(() => {
    if (prevRunningRef.current && tokenProgress && !tokenProgress.isRunning) {
      // running → durdu transition
      fetchSuppliers()
    }
    if (tokenProgress) prevRunningRef.current = tokenProgress.isRunning
  }, [tokenProgress])

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await supplierService.getAll()
      if (response.success && response.data) {
        setSuppliers(response.data.map((s: any) => ({
          id: s.id,
          name: s.name || '',
          discountRate: Number(s.discount) || 0,
          isActive: s.isActive ?? true,
          contactPerson: s.contactName || '',
          email: s.email || '',
          phone: s.phone || '',
          token: s.token || '',
          tokenUpdatedAt: s.tokenUpdatedAt || null,
          euroKur: s.euroKur ?? null,
          dolarKur: s.dolarKur ?? null,
          username: s.username || '',
          password: s.password || '',
          loginUrl: s.loginUrl || '',
        })))
      }
    } catch {
      toast({ title: "Hata", description: "Tedarikçiler yüklenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  // Filtrelenmiş tedarikçiler
  const filteredSuppliers = searchTerm
    ? suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : suppliers

  // Tedarikçiyi aktif/pasif yap
  const handleUpdateSupplier = async () => {
    if (!editModal.supplier) return
    try {
      const name = (document.getElementById('edit-name') as HTMLInputElement)?.value
      const discountRate = Number((document.getElementById('edit-discount') as HTMLInputElement)?.value) || 0
      const isActive = (document.getElementById('edit-active') as HTMLInputElement)?.checked
      const token = (document.getElementById('edit-token') as HTMLTextAreaElement)?.value || null
      const euroKurRaw = (document.getElementById('edit-euro') as HTMLInputElement)?.value
      const dolarKurRaw = (document.getElementById('edit-dolar') as HTMLInputElement)?.value
      const euroKur = euroKurRaw ? Number(euroKurRaw) : null
      const dolarKur = dolarKurRaw ? Number(dolarKurRaw) : null
      const username = (document.getElementById('edit-username') as HTMLInputElement)?.value || null
      const password = (document.getElementById('edit-password') as HTMLInputElement)?.value || null
      const loginUrl = (document.getElementById('edit-login-url') as HTMLInputElement)?.value || null
      await supplierService.update(editModal.supplier.id, {
        name,
        discount: discountRate,
        isActive,
        token,
        euroKur,
        dolarKur,
        username,
        password,
        loginUrl,
      } as any)
      toast({ title: "Başarılı", description: "Tedarikçi güncellendi" })
      setEditModal({ open: false, supplier: null })
      fetchSuppliers()
    } catch {
      toast({ title: "Hata", description: "Güncelleme başarısız", variant: "destructive" })
    }
  }

  const handleRefreshToken = async (supplierName: string) => {
    try {
      await tokenRefreshService.refreshOne(supplierName)
      toast({
        title: "Token yenileme başlatıldı",
        description: `${supplierName} için arka planda Puppeteer ile login yapılıyor (15-30 saniye)`,
      })
      // 30 saniye sonra listeyi yenile (token DB'ye yazılmış olur)
      setTimeout(() => fetchSuppliers(), 30000)
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Token yenileme başlatılamadı", variant: "destructive" })
    }
  }

  const handleRefreshAllTokens = async () => {
    try {
      await tokenRefreshService.refreshAll()
      toast({
        title: "Tüm tokenler yenileniyor",
        description: "6 tedarikçi için arka planda login yapılıyor (1-3 dakika)",
      })
      setTimeout(() => fetchSuppliers(), 90000)
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    }
  }

  const handleToggleSupplier = (supplierId: string) => {
    setSuppliers(suppliers.map(supplier =>
      supplier.id === supplierId ? { ...supplier, isActive: !supplier.isActive } : supplier
    ))
  }

  // İstatistikler
  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.isActive).length,
    avgDiscount: (suppliers.reduce((sum, s) => sum + s.discountRate, 0) / suppliers.length).toFixed(1),
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-gray-50/50 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tedarikçi Oranları</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Tedarikçi komisyon ve indirim oranlarını yönetin
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefreshAllTokens}
              variant="outline"
              size="sm"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
              disabled={tokenProgress?.isRunning}
            >
              {tokenProgress?.isRunning
                ? `⏳ Yenileniyor... (${tokenProgress.successCount + tokenProgress.errorCount}/${tokenProgress.total})`
                : '🔄 Tüm Tokenleri Yenile'}
            </Button>
            <Button
              onClick={() => setAddModal(true)}
              className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-shadow"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Tedarikçi
            </Button>
          </div>
        </div>

        {/* Token Refresh Canlı Banner */}
        {tokenProgress && (tokenProgress.isRunning || tokenProgress.suppliers.length > 0) && (
          <Card className="border-purple-200 dark:border-purple-900/40 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {tokenProgress.isRunning && (
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  )}
                  <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">
                    {tokenProgress.isRunning
                      ? `Token yenileniyor: ${tokenProgress.current || '...'}`
                      : 'Son token yenileme oturumu'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-700 dark:text-green-400">✓ {tokenProgress.successCount} başarılı</span>
                  {tokenProgress.errorCount > 0 && (
                    <span className="text-red-700 dark:text-red-400">✗ {tokenProgress.errorCount} hata</span>
                  )}
                  <span className="text-gray-600 dark:text-gray-400">
                    {tokenProgress.successCount + tokenProgress.errorCount}/{tokenProgress.total}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tokenProgress.suppliers.map((s) => {
                  const color =
                    s.status === 'running' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700' :
                    s.status === 'success' ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700' :
                    s.status === 'error'   ? 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700' :
                                              'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                  const icon =
                    s.status === 'running' ? '⏳' :
                    s.status === 'success' ? '✓' :
                    s.status === 'error'   ? '✗' : '·'
                  return (
                    <span
                      key={s.supplier}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border ${color}`}
                      title={s.error || (s.tokenLength ? `${s.tokenLength} char, ${s.durationSec?.toFixed(1)}s` : '')}
                    >
                      <span>{icon}</span>
                      <span>{s.supplier}</span>
                      {s.status === 'success' && s.durationSec != null && (
                        <span className="opacity-70">({s.durationSec.toFixed(0)}s)</span>
                      )}
                    </span>
                  )
                })}
              </div>
              {tokenProgress.suppliers.find(s => s.status === 'error')?.error && (
                <div className="text-[11px] text-red-700 dark:text-red-400 truncate">
                  {tokenProgress.suppliers.find(s => s.status === 'error')?.supplier}: {tokenProgress.suppliers.find(s => s.status === 'error')?.error}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* İstatistikler */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Toplam Tedarikçi</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-100 dark:border-green-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Aktif Tedarikçi</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-500">{stats.active}</p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4 border border-orange-100 dark:border-orange-900/30">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Ort. Ek İskonto</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-500">%{stats.avgDiscount}</p>
          </div>
        </div>

        {/* Arama */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Tedarikçi veya yetkili ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>

        {/* Tablo */}
        <Card className="shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-white dark:bg-gray-900 border-b dark:border-gray-700">
                  <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 w-[250px]">
                    Tedarikçi Adı
                  </TableHead>
                  <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 w-[150px]">
                    Yetkili Kişi
                  </TableHead>
                  <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 w-[150px]">
                    Token Durumu
                  </TableHead>
                  <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 text-center w-[120px]">
                    Ek İskonto
                  </TableHead>
                  <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 w-[180px]">
                    İletişim
                  </TableHead>
                  <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 text-center w-[100px]">
                    Durum
                  </TableHead>
                  <TableHead className="font-medium text-gray-700 dark:text-gray-200 text-xs h-10 py-2 text-center w-[120px]">
                    İşlemler
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow
                    key={supplier.id}
                    className="border-b dark:border-gray-700 hover:bg-blue-50/30 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <TableCell className="py-2 h-12">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 text-blue-500 mr-2" />
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                          {supplier.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 dark:text-gray-400 py-2 h-12">
                      {supplier.contactPerson}
                    </TableCell>
                    <TableCell className="py-2 h-12">
                      {(() => {
                        const ago = timeAgo(supplier.tokenUpdatedAt)
                        const hasToken = supplier.token && supplier.token.length > 10
                        return (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${hasToken ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={`text-xs font-medium ${ago.color}`}>
                                {hasToken ? ago.text : 'Token yok'}
                              </span>
                            </div>
                            {hasToken && supplier.tokenUpdatedAt && (
                              <span className="text-[10px] text-gray-400 ml-3">
                                {new Date(supplier.tokenUpdatedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="py-2 h-12 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-xs font-semibold">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {supplier.discountRate}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600 dark:text-gray-400 py-2 h-12">
                      <div className="space-y-0.5">
                        <div>{supplier.phone}</div>
                        <div className="text-[10px] text-gray-500">{supplier.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 h-12 text-center">
                      {supplier.isActive ? (
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
                          onClick={() => setEditModal({ open: true, supplier })}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${
                            supplier.isActive
                              ? "text-green-600 hover:text-green-700"
                              : "text-red-600 hover:text-red-700"
                          }`}
                          onClick={() => handleToggleSupplier(supplier.id)}
                          title={supplier.isActive ? "Pasif Yap" : "Aktif Yap"}
                        >
                          {supplier.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700 dark:text-red-400"
                          title="Sil"
                          onClick={() => setDeleteModal({ open: true, supplierId: supplier.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Sheet */}
        <Sheet open={editModal.open} onOpenChange={(open) => setEditModal({ open, supplier: null })}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Tedarikçi Düzenle</SheetTitle>
            </SheetHeader>
            {editModal.supplier && (
              <div className="space-y-6 p-6">
                <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                    Tedarikçi Bilgileri
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="edit-name" className="text-xs">Tedarikçi Adı</Label>
                    <Input
                      id="edit-name"
                      defaultValue={editModal.supplier.name}
                      className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                      placeholder="Tedarikçi adını girin"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-discount" className="text-xs">Ek İskonto Oranı (%)</Label>
                    <Input
                      id="edit-discount"
                      type="number"
                      defaultValue={editModal.supplier.discountRate}
                      className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-contact" className="text-xs">Yetkili Kişi</Label>
                    <Input
                      id="edit-contact"
                      defaultValue={editModal.supplier.contactPerson}
                      className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                      placeholder="Yetkili kişi adını girin"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-email" className="text-xs">E-posta</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      defaultValue={editModal.supplier.email}
                      className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                      placeholder="E-posta adresi"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-phone" className="text-xs">Telefon</Label>
                    <Input
                      id="edit-phone"
                      defaultValue={editModal.supplier.phone}
                      className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                      placeholder="Telefon numarası"
                    />
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" />
                        B2B Entegrasyonu
                      </h4>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                        onClick={() => editModal.supplier && handleRefreshToken(editModal.supplier.name)}
                      >
                        🔄 Token Yenile (Otomatik Login)
                      </Button>
                    </div>

                    {/* Otomatik login için credentials */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-username" className="text-xs">Kullanıcı Adı</Label>
                        <Input
                          id="edit-username"
                          defaultValue={editModal.supplier.username}
                          className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                          placeholder="info@firma.com veya kod"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-password" className="text-xs">Şifre</Label>
                        <Input
                          id="edit-password"
                          type="password"
                          defaultValue={editModal.supplier.password}
                          className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                          placeholder="••••••"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-login-url" className="text-xs">Login URL</Label>
                      <Input
                        id="edit-login-url"
                        defaultValue={editModal.supplier.loginUrl}
                        className="text-[10px] font-mono bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                        placeholder="https://b2b.tedarikci.com/Login"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-token" className="text-xs">
                        Session / Cookie (Token)
                        <span className="text-[10px] text-gray-500 ml-2">"Token Yenile" otomatik doldurur veya elle yapıştırın</span>
                      </Label>
                      <Textarea
                        id="edit-token"
                        defaultValue={editModal.supplier.token}
                        rows={3}
                        className="text-[10px] font-mono bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                        placeholder="ASP.NET_SessionId=xxxx; .ASPXAUTH=...;"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-dolar" className="text-xs">USD Kur (₺)</Label>
                        <Input
                          id="edit-dolar"
                          type="number"
                          step="0.01"
                          defaultValue={editModal.supplier.dolarKur ?? ""}
                          className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                          placeholder="35.50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-euro" className="text-xs">EUR Kur (₺)</Label>
                        <Input
                          id="edit-euro"
                          type="number"
                          step="0.01"
                          defaultValue={editModal.supplier.euroKur ?? ""}
                          className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                          placeholder="38.20"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Döviz kurları sadece Civaner gibi yabancı para fiyatı çeken tedarikçilerde kullanılır.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-4">
                    <Label htmlFor="edit-active" className="text-xs font-medium">Durum</Label>
                    <Switch
                      id="edit-active"
                      defaultChecked={editModal.supplier.isActive}
                      className="scale-125 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:via-violet-500 data-[state=checked]:to-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setEditModal({ open: false, supplier: null })}
                    className="flex-1 h-10"
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={handleUpdateSupplier}
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

        {/* Add Sheet */}
        <Sheet open={addModal} onOpenChange={setAddModal}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Yeni Tedarikçi Ekle</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 p-6">
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
                  Tedarikçi Bilgileri
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="add-name" className="text-xs">Tedarikçi Adı</Label>
                  <Input
                    id="add-name"
                    className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    placeholder="Tedarikçi adını girin"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-discount" className="text-xs">Ek İskonto Oranı (%)</Label>
                  <Input
                    id="add-discount"
                    type="number"
                    className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-contact" className="text-xs">Yetkili Kişi</Label>
                  <Input
                    id="add-contact"
                    className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    placeholder="Yetkili kişi adını girin"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-email" className="text-xs">E-posta</Label>
                  <Input
                    id="add-email"
                    type="email"
                    className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    placeholder="E-posta adresi"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-phone" className="text-xs">Telefon</Label>
                  <Input
                    id="add-phone"
                    className="text-xs bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    placeholder="Telefon numarası"
                  />
                </div>

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

        {/* Delete Modal */}
        <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open, supplierId: null })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Tedarikçiyi Sil
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bu tedarikçiyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ open: false, supplierId: null })}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteModal.supplierId) {
                    setSuppliers(suppliers.filter(s => s.id !== deleteModal.supplierId))
                    setDeleteModal({ open: false, supplierId: null })
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Sil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
