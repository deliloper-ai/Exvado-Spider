"use client"

import React, { useState, useEffect, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  RefreshCw, CheckCircle, XCircle, PlayCircle, StopCircle, Activity, Clock, Loader2, AlertCircle, Package, Boxes,
} from "lucide-react"
import { syncApiService } from "@/lib/api"
import type { SyncStatusResponse, SyncTriggerMode } from "@/lib/api/sync.service"
import { useToast } from "@/hooks/use-toast"

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
}

function statusBadge(status: 'success' | 'error') {
  return status === 'success'
    ? <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100">Başarılı</Badge>
    : <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-100">Hata</Badge>
}

const STEP_LABELS: Record<string, string> = {
  idle: 'Boşta',
  fetching: 'Tedarikçiden veri çekiliyor',
  normalizing: 'Veri standartlaştırılıyor',
  upserting: 'Veritabanına yazılıyor',
  recalculating: 'Fiyatlar yeniden hesaplanıyor',
  finalizing: 'Tamamlanıyor',
}

export default function CronSyncPage() {
  const { toast } = useToast()
  const [data, setData] = useState<SyncStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await syncApiService.getStatus()
      if (res.success && res.data) setData(res.data)
    } catch {
      // Polling devam etsin
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    // Sync çalışırken canlı izleme için 1sn polling, idle'da 15sn
    const interval = setInterval(() => fetchStatus(), data?.isRunning ? 1000 : 15000)
    return () => clearInterval(interval)
  }, [fetchStatus, data?.isRunning])

  const handleSyncAll = async (mode: SyncTriggerMode = 'full') => {
    setActionLoading(`all-${mode}`)
    try {
      await syncApiService.triggerAll(mode)
      toast({
        title: "Sync başlatıldı",
        description: mode === 'full'
          ? "Tüm katalog güncelleniyor (uzun sürecek)"
          : "Envanter ürünleri güncelleniyor"
      })
      setTimeout(fetchStatus, 1000)
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Sync başlatılamadı", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSyncSupplier = async (supplierName: string, mode: SyncTriggerMode = 'full') => {
    setActionLoading(`${supplierName}-${mode}`)
    try {
      await syncApiService.triggerSupplier(supplierName, mode)
      toast({
        title: "Sync başlatıldı",
        description: `${supplierName} ${mode === 'inventory' ? '(envanter)' : '(tüm katalog)'} sync ediliyor`
      })
      setTimeout(fetchStatus, 1000)
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Sync başlatılamadı", variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleStopSync = async () => {
    if (!confirm("Sync lock'unu serbest bırakmak istediğinize emin misiniz?")) return
    setActionLoading('stop')
    try {
      await syncApiService.stop()
      toast({ title: "Lock serbest bırakıldı", description: "Yeni sync başlatılabilir" })
      fetchStatus()
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </MainLayout>
    )
  }

  const supplierEntries = data ? Object.entries(data.suppliers) : []

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-gray-50/50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tedarikçi Sync</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cron job durumu ve manuel tetikleme</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchStatus} className="bg-white">
              <RefreshCw className="h-4 w-4 mr-2" /> Yenile
            </Button>
            {data?.isRunning ? (
              <Button variant="destructive" size="sm" onClick={handleStopSync} disabled={actionLoading === 'stop'}>
                {actionLoading === 'stop' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <StopCircle className="h-4 w-4 mr-2" />}
                Lock'u Serbest Bırak
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => handleSyncAll('inventory')} disabled={!!actionLoading} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  {actionLoading === 'all-inventory' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Boxes className="h-4 w-4 mr-2" />}
                  Envanter Stok Güncelle
                </Button>
                <Button size="sm" onClick={() => handleSyncAll('full')} disabled={!!actionLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {actionLoading === 'all-full' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Package className="h-4 w-4 mr-2" />}
                  Tüm Katalog Sync
                </Button>
              </>
            )}
          </div>
        </div>

        {data?.isRunning ? (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3 flex-shrink-0">
                  <div className="animate-ping absolute h-full w-full rounded-full bg-blue-400 opacity-75"></div>
                  <div className="relative rounded-full h-3 w-3 bg-blue-500"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {data.progress?.currentSupplier
                      ? `${data.progress.currentSupplier} sync ediliyor`
                      : 'Sync çalışıyor'}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {data.progress?.message || 'İşlem arka planda devam ediyor'}
                  </p>
                </div>
                {data.progress && (
                  <Badge variant="outline" className="bg-white border-blue-300 text-blue-700 text-xs whitespace-nowrap">
                    {STEP_LABELS[data.progress.currentStep] || data.progress.currentStep}
                  </Badge>
                )}
              </div>

              {/* Progress bar */}
              {data.progress && data.progress.total > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300">
                    <span>{data.progress.processed.toLocaleString('tr-TR')} / {data.progress.total.toLocaleString('tr-TR')} ürün</span>
                    <span>%{Math.round((data.progress.processed / data.progress.total) * 100)}</span>
                  </div>
                  <div className="h-2 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(100, (data.progress.processed / data.progress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Live counters */}
              {data.progress && (data.progress.createdCount > 0 || data.progress.updatedCount > 0 || data.progress.skippedCount > 0) && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white dark:bg-gray-800 rounded p-2 text-center border border-blue-200">
                    <div className="font-bold text-blue-700 dark:text-blue-300 text-base">{data.progress.createdCount}</div>
                    <div className="text-gray-500">Yeni</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded p-2 text-center border border-amber-200">
                    <div className="font-bold text-amber-700 dark:text-amber-300 text-base">{data.progress.updatedCount}</div>
                    <div className="text-gray-500">Güncellendi</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded p-2 text-center border border-gray-200">
                    <div className="font-bold text-gray-700 dark:text-gray-300 text-base">{data.progress.skippedCount}</div>
                    <div className="text-gray-500">Atlandı</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-gray-200 bg-white dark:bg-gray-800">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-700 dark:text-gray-300">Sync boşta — yeni sync başlatılabilir</p>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Tedarikçiler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {supplierEntries.length === 0 ? (
                <div className="col-span-full text-center text-gray-500 py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  Aktif tedarikçi yok
                </div>
              ) : supplierEntries.map(([name, info]) => (
                <div key={name} className="border rounded-lg p-3 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-sm">{name}</h3>
                      {info ? (
                        <div className="flex items-center gap-2 mt-1">
                          {info.status === 'success'
                            ? <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            : <XCircle className="h-3.5 w-3.5 text-red-600" />}
                          <span className="text-xs text-gray-500">{formatDate(info.lastRun)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Hiç sync yapılmadı</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleSyncSupplier(name, 'inventory')}
                        disabled={!!actionLoading || data?.isRunning}
                        title="Sadece envanter ürünlerini güncelle"
                      >
                        {actionLoading === `${name}-inventory` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Boxes className="h-3.5 w-3.5 text-emerald-600" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleSyncSupplier(name, 'full')}
                        disabled={!!actionLoading || data?.isRunning}
                        title="Tüm katalogu sync et"
                      >
                        {actionLoading === `${name}-full` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5 text-blue-600" />}
                      </Button>
                    </div>
                  </div>
                  {info && (
                    <div className="grid grid-cols-3 gap-1 mt-2 text-[10px] text-center">
                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-1.5">
                        <div className="font-bold text-blue-700 dark:text-blue-300">{info.createdCount}</div>
                        <div className="text-gray-500">Yeni</div>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950/30 rounded p-1.5">
                        <div className="font-bold text-amber-700 dark:text-amber-300">{info.updatedCount}</div>
                        <div className="text-gray-500">Güncel</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/30 rounded p-1.5">
                        <div className="font-bold text-gray-700 dark:text-gray-300">{info.totalCount}</div>
                        <div className="text-gray-500">Toplam</div>
                      </div>
                    </div>
                  )}
                  {info?.error && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-[10px] text-red-700 dark:text-red-400 line-clamp-2" title={info.error}>
                      {info.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Son Sync Logları
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tedarikçi</TableHead>
                  <TableHead className="text-xs">Durum</TableHead>
                  <TableHead className="text-xs">Yeni</TableHead>
                  <TableHead className="text-xs">Güncel</TableHead>
                  <TableHead className="text-xs">Toplam</TableHead>
                  <TableHead className="text-xs">Süre</TableHead>
                  <TableHead className="text-xs">Tarih</TableHead>
                  <TableHead className="text-xs">Hata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.recentLogs.length ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-gray-500 py-8">Log kaydı yok</TableCell></TableRow>
                ) : data.recentLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs font-medium">{log.supplierName}</TableCell>
                    <TableCell>{statusBadge(log.status)}</TableCell>
                    <TableCell className="text-xs">{log.createdCount}</TableCell>
                    <TableCell className="text-xs">{log.updatedCount}</TableCell>
                    <TableCell className="text-xs">{log.totalCount}</TableCell>
                    <TableCell className="text-xs">{log.duration ? `${parseFloat(log.duration).toFixed(1)}s` : '-'}</TableCell>
                    <TableCell className="text-xs text-gray-500">{formatDate(log.createdAt)}</TableCell>
                    <TableCell className="text-xs text-red-600 max-w-[200px] truncate" title={log.error || ''}>{log.error || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
