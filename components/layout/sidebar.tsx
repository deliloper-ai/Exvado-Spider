"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  CreditCard,
  Mail,
  Calendar,
  Activity,
  FolderOpen,
  BarChart3,
  Database,
  Shield,
  Briefcase,
  Plus,
  List,
  Tags,
  Building2,
  Truck,
  Upload,
  Clock,
  Trash2,
  AlertCircle,
  RefreshCw,
  Users2,
  Merge,
  FileImage,
  Globe,
  Zap,
  Code,
  FormInput,
  Navigation,
  Layout,
  Images,
  Smartphone,
  Menu as MenuIcon,
  FileSearch,
  Map,
  Link2,
  LinkIcon,
  MapPin,
  TrendingDown,
  Trophy,
  Star,
  Package2,
  SearchIcon,
  Radio,
  AlertTriangle,
  Eye,
  Rss,
  Facebook,
  ExternalLink,
  Settings2,
  FileCode,
  Tag,
  Percent,
  Target,
  Gift,
  ShoppingBag,
  DollarSign,
  Server,
  Archive,
  Coins,
  UserCog,
  Wallet,
  Calculator,
  Building,
  Award,
  Plug,
  ClipboardList,
  Sparkles,
  Bell,
  LogOut,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/ui/logo"
import { syncApiService } from "@/lib/api"
import type { SyncStatusResponse } from "@/lib/api/sync.service"

const menuItems = [
  {
    title: "Genel Bakış",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/", badge: null },
    ]
  },
  {
    title: "Ürün Yönetimi",
    items: [
      { icon: List, label: "Ürün Listesi", href: "/products", badge: null },
      { icon: Package, label: "Envanter Listesi", href: "/inventory", badge: null },
      { icon: Tags, label: "Kategori Yönetimi", href: "/categories", badge: null },
      { icon: Building2, label: "Marka Yönetimi", href: "/brands", badge: null },
      { icon: ClipboardList, label: "Teknik Özellikler", href: "/specifications", badge: null },
      { icon: Package2, label: "Desi Tanımlamaları", href: "/desi", badge: null },
    ]
  },
  {
    title: "Tedarikçi Yönetimi",
    items: [
      { icon: Percent, label: "Tedarikçi Oranları", href: "/supplier-rates", badge: null },
      { icon: FileText, label: "Tedarikçi Logları", href: "/supplier-logs", badge: null },
      { icon: RefreshCw, label: "Cron Sync Rapor", href: "/cron-sync", badge: null },
      { icon: FileCode, label: "XML Sync", href: "/xml-sync", badge: null },
      { icon: Activity, label: "Worker Logları", href: "/worker-logs", badge: null },
    ]
  },
  {
    title: "Sipariş Yönetimi",
    items: [
      { icon: ShoppingCart, label: "Sipariş Listesi", href: "/orders", badge: null },
      { icon: Mail, label: "Sipariş Soruları", href: "/order-questions", badge: null },
    ]
  },
  {
    title: "Raporlar",
    items: [
      { icon: BarChart3, label: "Satış Raporları", href: "/sales-reports", badge: null },
      { icon: TrendingDown, label: "Ürün Raporları", href: "/product-reports", badge: null },
      { icon: TrendingUp, label: "Büyüme Raporları", href: "/growth-reports", badge: null },
      { icon: Merge, label: "Ürün Karşılaştırma", href: "/product-comparison", badge: "new" },
    ]
  },
  {
    title: "Ayarlar",
    items: [
      { icon: Settings, label: "Genel Ayarlar", href: "/settings", badge: null },
      { icon: Mail, label: "E-posta Ayarları", href: "/email-settings", badge: null },
      { icon: Database, label: "DB Update/Insert", href: "/db-sync", badge: null },
      { icon: ClipboardList, label: "Log Kayıtları", href: "/activity-logs", badge: null },
    ]
  },
]

type SectionTheme = {
  bar: string
  dot: string
  iconBg: string
  iconText: string
  iconHover: string
  ring: string
  activeBg: string
  thread: string
  glowShadow: string
}

const sectionThemes: Record<string, SectionTheme> = {
  "Genel Bakış": {
    bar: "from-emerald-400 via-teal-400 to-cyan-400",
    dot: "bg-emerald-500",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-400/15",
    iconText: "text-emerald-600 dark:text-emerald-400",
    iconHover: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
    ring: "ring-emerald-500/30 dark:ring-emerald-400/30",
    activeBg: "bg-emerald-50/80 dark:bg-emerald-500/10",
    thread: "from-emerald-300/0 via-emerald-300/60 to-emerald-300/0 dark:via-emerald-400/40",
    glowShadow: "shadow-[0_2px_12px_-4px_rgba(16,185,129,0.35)]",
  },
  "Ürün Yönetimi": {
    bar: "from-amber-400 via-orange-400 to-yellow-400",
    dot: "bg-amber-500",
    iconBg: "bg-amber-500/10 dark:bg-amber-400/15",
    iconText: "text-amber-600 dark:text-amber-400",
    iconHover: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
    ring: "ring-amber-500/30 dark:ring-amber-400/30",
    activeBg: "bg-amber-50/80 dark:bg-amber-500/10",
    thread: "from-amber-300/0 via-amber-300/60 to-amber-300/0 dark:via-amber-400/40",
    glowShadow: "shadow-[0_2px_12px_-4px_rgba(245,158,11,0.35)]",
  },
  "Tedarikçi Yönetimi": {
    bar: "from-rose-400 via-pink-400 to-fuchsia-400",
    dot: "bg-rose-500",
    iconBg: "bg-rose-500/10 dark:bg-rose-400/15",
    iconText: "text-rose-600 dark:text-rose-400",
    iconHover: "group-hover:text-rose-600 dark:group-hover:text-rose-400",
    ring: "ring-rose-500/30 dark:ring-rose-400/30",
    activeBg: "bg-rose-50/80 dark:bg-rose-500/10",
    thread: "from-rose-300/0 via-rose-300/60 to-rose-300/0 dark:via-rose-400/40",
    glowShadow: "shadow-[0_2px_12px_-4px_rgba(244,63,94,0.35)]",
  },
  "Sipariş Yönetimi": {
    bar: "from-sky-400 via-blue-400 to-indigo-400",
    dot: "bg-sky-500",
    iconBg: "bg-sky-500/10 dark:bg-sky-400/15",
    iconText: "text-sky-600 dark:text-sky-400",
    iconHover: "group-hover:text-sky-600 dark:group-hover:text-sky-400",
    ring: "ring-sky-500/30 dark:ring-sky-400/30",
    activeBg: "bg-sky-50/80 dark:bg-sky-500/10",
    thread: "from-sky-300/0 via-sky-300/60 to-sky-300/0 dark:via-sky-400/40",
    glowShadow: "shadow-[0_2px_12px_-4px_rgba(14,165,233,0.35)]",
  },
  "Raporlar": {
    bar: "from-violet-400 via-purple-400 to-fuchsia-400",
    dot: "bg-violet-500",
    iconBg: "bg-violet-500/10 dark:bg-violet-400/15",
    iconText: "text-violet-600 dark:text-violet-400",
    iconHover: "group-hover:text-violet-600 dark:group-hover:text-violet-400",
    ring: "ring-violet-500/30 dark:ring-violet-400/30",
    activeBg: "bg-violet-50/80 dark:bg-violet-500/10",
    thread: "from-violet-300/0 via-violet-300/60 to-violet-300/0 dark:via-violet-400/40",
    glowShadow: "shadow-[0_2px_12px_-4px_rgba(139,92,246,0.35)]",
  },
  "Ayarlar": {
    bar: "from-slate-400 via-zinc-400 to-gray-400",
    dot: "bg-slate-500",
    iconBg: "bg-slate-500/10 dark:bg-slate-400/15",
    iconText: "text-slate-600 dark:text-slate-300",
    iconHover: "group-hover:text-slate-700 dark:group-hover:text-slate-200",
    ring: "ring-slate-500/30 dark:ring-slate-400/30",
    activeBg: "bg-slate-100/80 dark:bg-slate-500/10",
    thread: "from-slate-300/0 via-slate-300/60 to-slate-300/0 dark:via-slate-500/40",
    glowShadow: "shadow-[0_2px_12px_-4px_rgba(100,116,139,0.30)]",
  },
}

const fallbackTheme = sectionThemes["Ayarlar"]

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return "—"
  const diff = Math.max(0, Date.now() - t)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}sn önce`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}dk önce`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}sa önce`
  const day = Math.floor(hr / 24)
  return `${day}g önce`
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchStatus = async () => {
      try {
        const res = await syncApiService.getStatus()
        if (!cancelled && res.success && res.data) setSyncStatus(res.data)
      } catch {
        // sessizce yut, polling devam etsin
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, syncStatus?.isRunning ? 2000 : 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [syncStatus?.isRunning])

  const lastLog = syncStatus?.recentLogs?.[0]
  const isRunning = !!syncStatus?.isRunning
  const hasError = !isRunning && lastLog?.status === "error"
  const supplierEntries = syncStatus?.suppliers ? Object.entries(syncStatus.suppliers) : []
  const successCount = supplierEntries.filter(([, v]) => v?.status === "success").length
  const totalSuppliers = supplierEntries.length
  const sparkData = (syncStatus?.recentLogs ?? []).slice(0, 9).reverse()
  const sparkMax = Math.max(1, ...sparkData.map(l => (l.createdCount ?? 0) + (l.updatedCount ?? 0)))

  const statusLabel = isRunning ? "Çalışıyor" : hasError ? "Hata" : totalSuppliers > 0 ? "Senkronize" : "Hazır"
  const statusSub = isRunning
    ? syncStatus?.progress?.currentSupplier
      ? `${syncStatus.progress.currentSupplier} işleniyor`
      : "Sync devam ediyor"
    : hasError
      ? lastLog?.supplierName
        ? `${lastLog.supplierName} başarısız`
        : "Son sync başarısız"
      : totalSuppliers > 0
        ? `${successCount}/${totalSuppliers} tedarikçi aktif`
        : "Veri bekleniyor"
  const statusTime = lastLog?.createdAt ? formatRelative(lastLog.createdAt) : "—"

  const tone = isRunning
    ? {
        chip: "text-sky-700 dark:text-sky-400",
        ping: "bg-sky-400",
        dot: "bg-sky-500",
        bg: "from-white via-sky-50/30 to-white dark:from-slate-900 dark:via-sky-950/20 dark:to-slate-900",
        blur: "bg-sky-400/10",
        bar: "from-sky-400/60 to-sky-500 dark:from-sky-400/40 dark:to-sky-400",
        label: "CANLI",
      }
    : hasError
      ? {
          chip: "text-rose-700 dark:text-rose-400",
          ping: "bg-rose-400",
          dot: "bg-rose-500",
          bg: "from-white via-rose-50/30 to-white dark:from-slate-900 dark:via-rose-950/20 dark:to-slate-900",
          blur: "bg-rose-400/10",
          bar: "from-rose-400/60 to-rose-500 dark:from-rose-400/40 dark:to-rose-400",
          label: "DİKKAT",
        }
      : {
          chip: "text-emerald-700 dark:text-emerald-400",
          ping: "bg-emerald-400",
          dot: "bg-emerald-500",
          bg: "from-white via-emerald-50/30 to-white dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900",
          blur: "bg-emerald-400/10",
          bar: "from-emerald-400/60 to-emerald-500 dark:from-emerald-400/40 dark:to-emerald-400",
          label: "STABİL",
        }

  const getInitialOpenSections = () => {
    const sections: { [key: string]: boolean } = {
      "Genel Bakış": pathname === "/",
      "Ürün Yönetimi": ["/products", "/inventory", "/categories", "/brands", "/specifications", "/desi"].some(path => pathname.startsWith(path)),
      "Tedarikçi Yönetimi": ["/supplier-rates", "/supplier-logs", "/cron-sync", "/xml-sync"].some(path => pathname.startsWith(path)),
      "Sipariş Yönetimi": ["/orders", "/order-questions"].some(path => pathname.startsWith(path)),
      "Raporlar": ["/sales-reports", "/product-reports", "/growth-reports", "/product-comparison"].some(path => pathname.startsWith(path)),
      "Ayarlar": ["/settings", "/email-settings", "/activity-logs", "/db-sync"].some(path => pathname.startsWith(path)),
    }
    return sections
  }

  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>(getInitialOpenSections())

  useEffect(() => {
    setOpenSections(getInitialOpenSections())
  }, [pathname])

  const toggleSection = (sectionTitle: string) => {
    if (!collapsed) {
      setOpenSections(prev => ({
        ...prev,
        [sectionTitle]: !prev[sectionTitle]
      }))
    }
  }

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen shrink-0 transition-[width] duration-300 ease-out",
        "bg-white dark:bg-slate-950",
        "border-r border-slate-200/70 dark:border-slate-800/80",
        "shadow-[1px_0_0_0_rgba(15,23,42,0.02),4px_0_24px_-8px_rgba(15,23,42,0.04)]",
        "dark:shadow-[1px_0_0_0_rgba(255,255,255,0.02)]",
        collapsed ? "w-[76px]" : "w-[288px]"
      )}
    >
      {/* Decorative dot grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025] dark:opacity-[0.04] text-slate-900 dark:text-white"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />

      {/* Top hairline gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300/60 to-transparent dark:via-slate-700/60"
      />

      {/* Header */}
      <header
        className={cn(
          "relative h-16 flex items-center border-b border-slate-200/70 dark:border-slate-800/80",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        <Link href="/" className="flex items-center gap-2 min-w-0">
          <Logo size="md" showText={!collapsed} />
          {!collapsed && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-[0.18em] uppercase rounded-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/30 shrink-0">
              PRO
            </span>
          )}
        </Link>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(true)}
            className="h-7 w-7 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/80"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        )}
      </header>

      {/* Expanded-only top zone: Quick Actions + Live Sync Card */}
      {!collapsed && (
        <div className="relative px-3 pt-3 pb-2 space-y-2">
          {/* Quick actions strip — clickable links */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-br from-slate-50/80 to-white dark:from-slate-900/50 dark:to-slate-950">
            <Link
              href="/products"
              title="Ürünler"
              className="flex-1 h-8 flex items-center justify-center rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:scale-[1.04] active:scale-95 transition-all"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            </Link>
            <span className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <Link
              href="/product-comparison"
              title="Ürün Karşılaştırma"
              className="flex-1 h-8 flex items-center justify-center rounded-md text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:scale-[1.04] active:scale-95 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Link>
            <span className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <Link
              href="/cron-sync"
              title="Senkronizasyon"
              className="flex-1 h-8 flex items-center justify-center rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:scale-[1.04] active:scale-95 transition-all"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRunning && "animate-spin")} />
            </Link>
            <span className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <Link
              href="/activity-logs"
              title="Bildirimler"
              className="relative flex-1 h-8 flex items-center justify-center rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:scale-[1.04] active:scale-95 transition-all"
            >
              <Bell className="h-3.5 w-3.5" />
              {hasError && (
                <span className="absolute top-1.5 right-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" />
              )}
            </Link>
          </div>

          {/* Live sync status card — backed by syncApiService.getStatus() */}
          <Link
            href="/cron-sync"
            className={cn(
              "group relative block overflow-hidden rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-br p-2.5 transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm",
              tone.bg
            )}
          >
            <div
              aria-hidden
              className={cn("absolute -top-6 -right-6 h-16 w-16 rounded-full blur-2xl transition-opacity group-hover:opacity-150", tone.blur)}
            />
            <div className="relative flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", tone.ping, isRunning && "animate-ping")} />
                  <span className={cn("relative inline-flex h-2 w-2 rounded-full", tone.dot)} />
                </span>
                <span className={cn("text-[9px] font-bold tracking-[0.2em] uppercase", tone.chip)}>
                  {tone.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {statusTime}
              </span>
            </div>
            <div className="relative flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {statusLabel}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {statusSub}
                </div>
              </div>
              <div className="flex items-end gap-[2px] h-5 shrink-0">
                {sparkData.length > 0 ? (
                  sparkData.map((log, i) => {
                    const v = (log.createdCount ?? 0) + (log.updatedCount ?? 0)
                    const h = Math.max(8, Math.round((v / sparkMax) * 100))
                    const errored = log.status === "error"
                    return (
                      <span
                        key={`${log.id}-${i}`}
                        className={cn(
                          "w-[3px] rounded-sm bg-gradient-to-t",
                          errored
                            ? "from-rose-400/60 to-rose-500 dark:from-rose-400/40 dark:to-rose-400"
                            : tone.bar
                        )}
                        style={{ height: `${h}%` }}
                      />
                    )
                  })
                ) : (
                  Array.from({ length: 9 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-[3px] rounded-sm bg-slate-200 dark:bg-slate-800"
                      style={{ height: "20%" }}
                    />
                  ))
                )}
              </div>
            </div>
            {isRunning && syncStatus?.progress && syncStatus.progress.total > 0 && (
              <div className="relative mt-2 h-1 w-full rounded-full bg-slate-200/70 dark:bg-slate-800/70 overflow-hidden">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-500", tone.bar)}
                  style={{
                    width: `${Math.min(100, Math.round((syncStatus.progress.processed / syncStatus.progress.total) * 100))}%`,
                  }}
                />
              </div>
            )}
          </Link>
        </div>
      )}

      {/* Collapsed-only: expand toggle */}
      {collapsed && (
        <div className="px-2 pt-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(false)}
            className="h-9 w-full rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80"
            title="Menüyü genişlet"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Section divider label (expanded) */}
      {!collapsed && (
        <div className="relative px-3 pt-1 pb-1.5 flex items-center gap-2">
          <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-slate-400 dark:text-slate-500">
            Menü
          </span>
          <span className="flex-1 h-px bg-gradient-to-r from-slate-200 via-slate-200/40 to-transparent dark:from-slate-800 dark:via-slate-800/40" />
          <span className="text-[9px] font-mono font-semibold text-slate-400 dark:text-slate-500">
            {menuItems.reduce((acc, s) => acc + s.items.length, 0)} sayfa
          </span>
        </div>
      )}

      {/* Menu Items */}
      <nav
        className={cn(
          "relative flex-1 overflow-y-auto min-h-0",
          "[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-800",
          "hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-700",
          collapsed ? "px-2 pb-2" : "px-2 pb-2"
        )}
      >
        {/* Top fade */}
        <div
          aria-hidden
          className="sticky top-0 -mt-px h-3 bg-gradient-to-b from-white dark:from-slate-950 to-transparent pointer-events-none z-10"
        />

        {menuItems.map((section, idx) => {
          const theme = sectionThemes[section.title] || fallbackTheme
          const isOpen = openSections[section.title]
          const hasActive = section.items.some(it => pathname === it.href)

          if (collapsed) {
            return (
              <div key={idx} className="relative mb-1.5">
                {idx > 0 && (
                  <div className="flex items-center justify-center py-1.5">
                    <span className={cn("h-px w-6 rounded-full bg-gradient-to-r", theme.bar, "opacity-50")} />
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item, itemIdx) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={`${section.title}-collapsed-${itemIdx}`}
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "group relative flex items-center justify-center h-10 w-full rounded-lg transition-all duration-200",
                          isActive
                            ? cn(theme.activeBg, theme.glowShadow, "ring-1", theme.ring)
                            : "hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                        )}
                      >
                        {isActive && (
                          <span
                            className={cn(
                              "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b",
                              theme.bar
                            )}
                          />
                        )}
                        <Icon
                          className={cn(
                            "h-4 w-4 transition-colors",
                            isActive
                              ? theme.iconText
                              : cn("text-slate-500 dark:text-slate-400", theme.iconHover)
                          )}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        {item.badge && (
                          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          }

          return (
            <div key={idx} className="mb-1">
              {/* Section header */}
              <button
                onClick={() => toggleSection(section.title)}
                className={cn(
                  "group w-full px-2 py-1.5 flex items-center gap-2 rounded-md transition-all",
                  "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                )}
              >
                <span
                  className={cn(
                    "h-3 w-[3px] rounded-full bg-gradient-to-b transition-all",
                    theme.bar,
                    hasActive ? "shadow-sm" : "opacity-80"
                  )}
                />
                <span
                  className={cn(
                    "flex-1 text-left text-[10px] font-bold tracking-[0.16em] uppercase transition-colors",
                    hasActive
                      ? "text-slate-800 dark:text-slate-100"
                      : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                  )}
                >
                  {section.title}
                </span>
                <span
                  className={cn(
                    "min-w-[18px] px-1 py-px text-center rounded text-[9px] font-mono font-bold transition-colors",
                    hasActive
                      ? cn(theme.iconBg, theme.iconText)
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800/70 dark:text-slate-400"
                  )}
                >
                  {section.items.length.toString().padStart(2, "0")}
                </span>
                {isOpen ? (
                  <ChevronUp className="h-3 w-3 text-slate-400 dark:text-slate-500 transition-transform group-hover:-translate-y-0.5" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-slate-400 dark:text-slate-500 transition-transform group-hover:translate-y-0.5" />
                )}
              </button>

              {/* Items */}
              <div
                className={cn(
                  "relative overflow-hidden transition-all duration-300 ease-out",
                  isOpen ? "max-h-[700px] opacity-100 mt-0.5" : "max-h-0 opacity-0"
                )}
              >
                {/* Vertical thread line */}
                <div
                  aria-hidden
                  className={cn(
                    "absolute left-[18px] top-1 bottom-1 w-px bg-gradient-to-b",
                    theme.thread
                  )}
                />

                <div className="space-y-[2px] pl-2 pr-1 pb-1 pt-0.5">
                  {section.items.map((item, itemIdx) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href

                    return (
                      <Link
                        key={`${section.title}-${itemIdx}`}
                        href={item.href}
                        className={cn(
                          "group relative flex items-center gap-2.5 pl-2 pr-2 py-1.5 rounded-md transition-all duration-200",
                          isActive
                            ? cn(theme.activeBg, theme.glowShadow)
                            : "hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:translate-x-0.5"
                        )}
                      >
                        {/* Active accent bar */}
                        {isActive && (
                          <span
                            className={cn(
                              "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-gradient-to-b",
                              theme.bar
                            )}
                          />
                        )}

                        {/* Thread node */}
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-[2px] top-1/2 -translate-y-1/2 h-1 w-1 rounded-full transition-all",
                            isActive
                              ? cn(theme.dot, "scale-100 ring-2", theme.ring)
                              : "bg-slate-300 dark:bg-slate-700 scale-75 group-hover:scale-100"
                          )}
                        />

                        {/* Icon well */}
                        <span
                          className={cn(
                            "h-6 w-6 flex items-center justify-center rounded-md transition-all duration-200 shrink-0",
                            isActive
                              ? cn(theme.iconBg, theme.iconText, "ring-1", theme.ring)
                              : cn(
                                  "bg-slate-100/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400",
                                  "group-hover:bg-white dark:group-hover:bg-slate-800/80",
                                  theme.iconHover
                                )
                          )}
                        >
                          <Icon
                            className="h-3.5 w-3.5"
                            strokeWidth={isActive ? 2.5 : 2}
                          />
                        </span>

                        {/* Label */}
                        <span
                          className={cn(
                            "flex-1 text-xs transition-all truncate",
                            isActive
                              ? "font-semibold text-slate-900 dark:text-slate-50"
                              : "font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-50"
                          )}
                        >
                          {item.label}
                        </span>

                        {/* Badge */}
                        {item.badge && (
                          <span
                            className={cn(
                              "shrink-0 inline-flex items-center h-4 px-1.5 text-[9px] font-bold uppercase tracking-[0.1em] rounded",
                              item.badge === "new" || item.badge === "Yeni"
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            )}
                          >
                            {item.badge === "new" ? "Yeni" : item.badge}
                          </span>
                        )}

                        {/* Hover arrow */}
                        {!isActive && (
                          <ChevronRight
                            className={cn(
                              "h-3 w-3 text-slate-300 dark:text-slate-600 transition-all opacity-0 -translate-x-1",
                              "group-hover:opacity-100 group-hover:translate-x-0",
                              theme.iconHover
                            )}
                          />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}

        {/* Bottom fade */}
        <div
          aria-hidden
          className="sticky bottom-0 -mb-px h-4 bg-gradient-to-t from-white dark:from-slate-950 to-transparent pointer-events-none z-10"
        />
      </nav>

      {/* User Footer */}
      <footer
        className={cn(
          "relative border-t border-slate-200/70 dark:border-slate-800/80",
          "bg-gradient-to-b from-slate-50/40 to-white dark:from-slate-900/40 dark:to-slate-950"
        )}
      >
        {!collapsed ? (
          <div className="p-3 space-y-2">
            {/* User card */}
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-[13px] font-bold shadow-lg shadow-violet-500/30 ring-2 ring-white dark:ring-slate-950">
                  KU
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-50 truncate">
                    Koray Uslu
                  </p>
                  <span className="shrink-0 px-1 py-px text-[8px] font-bold uppercase tracking-[0.12em] rounded bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                    Admin
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  <span>Çevrimiçi</span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="font-mono">v2.4.1</span>
                </div>
              </div>
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                  title="Ayarlar"
                  asChild
                >
                  <Link href="/settings">
                    <Settings className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10"
                  title="Çıkış Yap"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2 flex flex-col items-center gap-1.5">
            <div className="relative">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-violet-500/30 ring-2 ring-white dark:ring-slate-950">
                KU
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-500/10"
              title="Çıkış Yap"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </footer>
    </aside>
  )
}
