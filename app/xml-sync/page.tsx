"use client"

import React, { useState, useEffect, useCallback } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  FileCode,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  Download,
  Loader2,
  Activity,
} from "lucide-react"
import { xmlService } from "@/lib/api"
import type { XmlLog, XmlLogsResponse } from "@/lib/api/xml.service"
import { useToast } from "@/hooks/use-toast"

function formatDate(iso: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'medium' })
}

function statusBadge(status: 'success' | 'partial' | 'failed') {
  if (status === 'success') return <Badge className="bg-green-100 text-green-700 border-green-300">Başarılı</Badge>
  if (status === 'partial') return <Badge className="bg-amber-100 text-amber-700 border-amber-300">Kısmi (hatalar var)</Badge>
  return <Badge className="bg-red-100 text-red-700 border-red-300">Başarısız</Badge>
}

export default function XMLSyncPage() {
  const { toast } = useToast()
  const [data, setData] = useState<XmlLogsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [errorSheet, setErrorSheet] = useState<{ open: boolean; log: XmlLog | null }>({ open: false, log: null })

  const fetchLogs = useCallback(async () => {
    try {
      const res = await xmlService.getLogs(20)
      if (res.success && res.data) setData(res.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    // generate sırasında polling 3sn, idle 30sn
    const interval = setInterval(() => fetchLogs(), generating ? 3000 : 30000)
    return () => clearInterval(interval)
  }, [fetchLogs, generating])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await xmlService.generate()
      toast({
        title: "XML üretimi başlatıldı",
        description: "Arka planda envanter ürünleri XML'e yazılıyor",
      })
      // 30 saniye sonra refresh
      setTimeout(() => {
        fetchLogs()
        setGenerating(false)
      }, 30000)
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "XML başlatılamadı", variant: "destructive" })
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    window.open(xmlService.getDownloadUrl(), '_blank')
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

  const lastSuccess = data?.logs.find(l => l.status === 'success')

  return (
    <MainLayout>
      <div className="p-8 space-y-6 bg-gray-50/50 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">XML Üretimi</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Envanterdeki aktif ürünler için <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">tum_urunler.xml</code> üret
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchLogs} className="bg-white">
              <RefreshCw className="h-4 w-4 mr-2" /> Yenile
            </Button>
            {data?.currentFile.exists && (
              <Button variant="outline" size="sm" onClick={handleDownload} className="bg-white">
                <Download className="h-4 w-4 mr-2" /> XML İndir ({data.currentFile.sizeText})
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            >
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCode className="h-4 w-4 mr-2" />}
              {generating ? 'Üretiliyor...' : 'XML Üret'}
            </Button>
          </div>
        </div>

        {/* Mevcut dosya kartı */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Mevcut XML</p>
                  <p className="text-lg font-bold">
                    {data?.currentFile.exists ? data.currentFile.sizeText : 'Yok'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                {data?.currentFile.modifiedAt
                  ? `Son: ${formatDate(data.currentFile.modifiedAt)}`
                  : 'Henüz üretilmedi'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/40">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Son Başarılı</p>
                  <p className="text-lg font-bold">
                    {lastSuccess ? lastSuccess.generatedProducts.toLocaleString('tr-TR') : '-'} ürün
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                {lastSuccess ? formatDate(lastSuccess.timestamp) : 'Hiç üretilmedi'}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Toplam Üretim</p>
                  <p className="text-lg font-bold">{data?.logs.length ?? 0}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400">Son 20 kayıt aşağıda</p>
            </CardContent>
          </Card>
        </div>

        {generating && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <div className="animate-ping absolute h-full w-full rounded-full bg-blue-400 opacity-75"></div>
                <div className="relative rounded-full h-3 w-3 bg-blue-500"></div>
              </div>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">XML üretiliyor</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">İşlem arka planda devam ediyor — sayfa 3 saniyede bir güncellenir</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loglar tablosu */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Üretim Geçmişi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.logs.length ? (
              <div className="text-center py-12 text-gray-500">
                <FileCode className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">Henüz XML üretilmedi</p>
                <p className="text-sm mt-1">Yukarıdaki "XML Üret" butonuna basarak başlatın</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="text-left p-2.5">Tarih</th>
                      <th className="text-left p-2.5">Durum</th>
                      <th className="text-right p-2.5">Süre</th>
                      <th className="text-right p-2.5">Toplam</th>
                      <th className="text-right p-2.5">Üretilen</th>
                      <th className="text-right p-2.5">Hata</th>
                      <th className="text-center p-2.5">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map(log => (
                      <tr key={log.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50/50">
                        <td className="p-2.5 text-gray-600">{formatDate(log.timestamp)}</td>
                        <td className="p-2.5">{statusBadge(log.status)}</td>
                        <td className="p-2.5 text-right">{log.duration > 0 ? `${log.duration}s` : '-'}</td>
                        <td className="p-2.5 text-right font-medium">{log.totalProducts.toLocaleString('tr-TR')}</td>
                        <td className="p-2.5 text-right text-green-700">{log.generatedProducts.toLocaleString('tr-TR')}</td>
                        <td className="p-2.5 text-right">
                          {log.failedProducts > 0 ? (
                            <span className="text-red-600 font-medium">{log.failedProducts}</span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {log.errors.length > 0 && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setErrorSheet({ open: true, log })}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> Hatalar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hata detay sheet */}
        <Sheet open={errorSheet.open} onOpenChange={(o) => setErrorSheet({ open: o, log: o ? errorSheet.log : null })}>
          <SheetContent className="w-[600px] sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Hata Detayları
              </SheetTitle>
              <SheetDescription>
                {errorSheet.log && `${formatDate(errorSheet.log.timestamp)} — ${errorSheet.log.errors.length} hata`}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-2">
              {errorSheet.log?.errors.map((e, i) => (
                <div key={i} className="border border-red-200 rounded-lg p-3 bg-red-50/50">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-mono text-gray-500">{e.sku}</span>
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">{e.name}</div>
                  <div className="text-xs text-red-700">{e.error}</div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </MainLayout>
  )
}
