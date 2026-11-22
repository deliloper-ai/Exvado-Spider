"use client"

import { useEffect, useRef, useState } from "react"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { workerLogsService, type WorkerLogFile, type WorkerLogContent } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, Search, Download, FileText, Key, FileCode, Cpu, Activity, Pause, Play } from "lucide-react"

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  token:  { label: "Token",      icon: Key,      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30" },
  sync:   { label: "Sync",       icon: RefreshCw, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
  xml:    { label: "XML",        icon: FileCode, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30" },
  spawn:  { label: "Spawn",      icon: Cpu,      color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
  other:  { label: "Diğer",      icon: FileText, color: "text-slate-600 bg-slate-50 dark:bg-slate-800/30" },
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function highlightLine(line: string): string {
  const lower = line.toLowerCase()
  if (lower.includes('error') || lower.includes('hata') || lower.includes('failed')) return 'text-red-400'
  if (lower.includes('warn') || lower.includes('uyarı')) return 'text-amber-400'
  if (lower.includes('success') || lower.includes('başarı') || lower.includes('✓')) return 'text-green-400'
  if (lower.includes('info')) return 'text-blue-300'
  return 'text-slate-300'
}

export default function WorkerLogsPage() {
  const { toast } = useToast()
  const [files, setFiles] = useState<WorkerLogFile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [content, setContent] = useState<WorkerLogContent | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const consoleRef = useRef<HTMLPreElement>(null)
  const wasAtBottom = useRef(true)

  const loadFiles = async () => {
    try {
      const res = await workerLogsService.list()
      if (res.success && res.data) {
        setFiles(res.data.files)
        if (!selectedFile && res.data.files.length > 0) {
          setSelectedFile(res.data.files[0].name)
        }
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Loglar listelenemedi", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const loadContent = async (name: string, silent = false) => {
    if (!silent) setContentLoading(true)
    try {
      // Auto-scroll için: önce mevcut bottom durumunu sakla
      if (consoleRef.current) {
        const el = consoleRef.current
        wasAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50
      }
      const res = await workerLogsService.read(name, 1000)
      if (res.success && res.data) {
        setContent(res.data)
      }
    } catch (err: any) {
      if (!silent) toast({ title: "Hata", description: err.message || "Log okunamadı", variant: "destructive" })
    } finally {
      if (!silent) setContentLoading(false)
    }
  }

  useEffect(() => { loadFiles() }, [])

  useEffect(() => {
    if (selectedFile) loadContent(selectedFile)
  }, [selectedFile])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !selectedFile) return
    const interval = setInterval(() => {
      loadFiles()
      loadContent(selectedFile, true)
    }, 4000)
    return () => clearInterval(interval)
  }, [autoRefresh, selectedFile])

  // Auto-scroll
  useEffect(() => {
    if (consoleRef.current && wasAtBottom.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [content])

  const filteredFiles = files.filter(f => {
    if (filter !== "all" && f.category !== filter) return false
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filteredContent = content && search
    ? content.content.split('\n').filter(l => l.toLowerCase().includes(search.toLowerCase())).join('\n')
    : content?.content || ''

  const downloadCurrent = async () => {
    if (!selectedFile) return
    try {
      const res = await workerLogsService.read(selectedFile, 0, true)
      if (res.success && res.data) {
        const blob = new Blob([res.data.content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = selectedFile
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "İndirilemedi", variant: "destructive" })
    }
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-6 w-6 text-purple-600" />
              Worker Logları
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Tedarikçi sync, token yenileme, XML üretim ve spawn loglarını canlı izle
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {autoRefresh ? <Pause className="h-3.5 w-3.5 mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
              {autoRefresh ? "Canlı (4sn)" : "Duraklat"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { loadFiles(); if (selectedFile) loadContent(selectedFile) }}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Yenile
            </Button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'token', 'sync', 'xml', 'spawn', 'other'] as const).map(cat => {
            const meta = cat === 'all'
              ? { label: 'Tümü', icon: Activity, color: 'text-slate-700 bg-slate-100 dark:bg-slate-800' }
              : CATEGORY_META[cat]
            const Icon = meta.icon
            const active = filter === cat
            const count = cat === 'all' ? files.length : files.filter(f => f.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all",
                  active ? meta.color + " ring-2 ring-offset-1 ring-current" : "text-slate-500 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100"
                )}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            )
          })}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-[300px_1fr] gap-4 h-[calc(100vh-220px)]">
          {/* Sol — Dosya listesi */}
          <Card className="overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Dosya ara veya log filtrele..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 text-center text-xs text-slate-400">Yükleniyor...</div>
              ) : filteredFiles.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">Log dosyası yok</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredFiles.map(f => {
                    const meta = CATEGORY_META[f.category]
                    const Icon = meta.icon
                    const active = selectedFile === f.name
                    return (
                      <button
                        key={f.name}
                        onClick={() => setSelectedFile(f.name)}
                        className={cn(
                          "w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-start gap-2.5",
                          active && "bg-purple-50 dark:bg-purple-950/30 border-l-2 border-purple-500"
                        )}
                      >
                        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0", meta.color)}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                            {f.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{f.sizeText}</span>
                            <span>•</span>
                            <span>{formatTime(f.modifiedAt)}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* Sağ — Log içerik */}
          <Card className="overflow-hidden flex flex-col bg-slate-950">
            <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {content ? (
                  <>
                    <div className={cn("w-1.5 h-1.5 rounded-full", autoRefresh ? "bg-green-500 animate-pulse" : "bg-slate-500")}></div>
                    <span className="text-xs font-mono text-slate-300 truncate">{content.name}</span>
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                      {content.returnedLines}/{content.totalLines} satır
                    </Badge>
                  </>
                ) : (
                  <span className="text-xs text-slate-500">Dosya seçilmedi</span>
                )}
              </div>
              {content && (
                <Button variant="ghost" size="sm" onClick={downloadCurrent} className="h-7 text-xs text-slate-300 hover:text-white hover:bg-slate-800">
                  <Download className="h-3 w-3 mr-1" />
                  Tümünü indir
                </Button>
              )}
            </div>
            <pre
              ref={consoleRef}
              className="flex-1 overflow-auto p-4 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all"
            >
              {contentLoading && !content ? (
                <span className="text-slate-500">Yükleniyor...</span>
              ) : !filteredContent ? (
                <span className="text-slate-500">{search ? 'Eşleşen satır yok' : 'İçerik yok'}</span>
              ) : (
                filteredContent.split('\n').map((line, i) => (
                  <div key={i} className={highlightLine(line)}>
                    <span className="text-slate-600 select-none mr-3">{String(i + 1).padStart(4, ' ')}</span>
                    {line || ' '}
                  </div>
                ))
              )}
            </pre>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
