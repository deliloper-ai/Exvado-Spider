// @ts-nocheck
// TODO: Bu sayfanın form alanları yeni Product type'ına göre tamamen refactor edilecek
"use client"

import { useState, useEffect, useMemo, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { MainLayout } from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { aiService, productService, desiService, categoryService, supplierProductService, specificationService, uploadService } from "@/lib/api"
import { generateBarcode } from "@/lib/utils/barcode"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  ChevronRight,
  ChevronsUpDown,
  Check,
  Upload,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  Calendar,
  Clock,
  X,
  Image as ImageIcon,
  Save,
  CheckCircle
} from "lucide-react"

export default function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supplierProductIdParam = searchParams?.get('supplierProductId') || null
  const isNew = id === 'new'

  const [productImages, setProductImages] = useState<string[]>([])

  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const [product, setProduct] = useState({
    name: "",
    supplier: "",
    brand: "",
    sku: "",
    barcode: "",
    desi: "",
    kdv: "20",
    isActive: false,
    eCommerce: false,
    marketplace: false,
    category: [] as string[],
    supplierCost: 0,
    productDiscount: 0,    // tedarikçi iskonto yüzdesi (DB: product_discount)
    bbbSalesPrice: 0,
    sopvoCost: 0,
    hepsiburadaCost: 0,
    n11Cost: 0,
    trendyolCost: 0,
    pazaramaCost: 0,
    specialDiscount: {
      enabled: false,
      percentage: 0,
      startDate: "",
      endDate: ""
    },
    previousCampaigns: [] as { date: string; discount: string; price: number; status: string }[],
    stock: {
      supplier: 0,
      our: 0,
      bolbolbul: 0,
      sopvo: 0
    },
    metaTitle: "",
    metaDescription: "",
    description: "",
    technicalSpecs: [] as { key: string; value: string; groupName?: string }[],
    images: [] as string[],
  })

  const { toast } = useToast()
  const [aiGenerating, setAiGenerating] = useState<string | null>(null)

  const generateWithAI = async (field: string, wordCount?: number) => {
    setAiGenerating(field)
    try {
      if (field === 'metaTitle' || field === 'metaDescription') {
        const categoryName = product.category[product.category.length - 1] || ''
        const result = await aiService.generateProductMeta(product.name, categoryName)
        setProduct(prev => ({
          ...prev,
          metaTitle: result.title,
          metaDescription: result.description,
        }))
        toast({ title: "Başarılı", description: "Meta bilgileri AI ile oluşturuldu" })
      } else if (field === 'description') {
        const min = wordCount || 150
        const max = min + 50
        const result = await aiService.generateProductDescription(
          product.name,
          product.technicalSpecs.map(s => ({ name: s.key, value: s.value })),
          min,
          max
        )
        setProduct(prev => ({ ...prev, description: result.description }))
        toast({ title: "Başarılı", description: "Ürün açıklaması AI ile oluşturuldu" })
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "AI ile oluşturulamadı", variant: "destructive" })
    } finally {
      setAiGenerating(null)
    }
  }

  const removeTechnicalSpec = (index: number) => {
    const newSpecs = product.technicalSpecs.filter((_, i) => i !== index)
    setProduct({ ...product, technicalSpecs: newSpecs })
  }

  // Görsel silme onay modali
  const [imageDeleteIndex, setImageDeleteIndex] = useState<number | null>(null)
  const [imageDeleting, setImageDeleting] = useState(false)

  const confirmDeleteImage = async () => {
    if (imageDeleteIndex === null) return
    const idx = imageDeleteIndex
    const newImages = productImages.filter((_, i) => i !== idx)

    setImageDeleting(true)
    try {
      // Yeni ürün ise sadece state'i güncelle (henüz DB'de yok)
      if (!isNew) {
        await productService.update(id, { images: newImages })
      }
      setProductImages(newImages)
      if (selectedImageIndex >= newImages.length) {
        setSelectedImageIndex(Math.max(0, newImages.length - 1))
      } else if (selectedImageIndex > idx) {
        setSelectedImageIndex(selectedImageIndex - 1)
      }
      toast({ title: "Silindi", description: "Görsel kaldırıldı" })
      setImageDeleteIndex(null)
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Görsel silinemedi", variant: "destructive" })
    } finally {
      setImageDeleting(false)
    }
  }

  const [saving, setSaving] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState(true)

  // Master data
  const [desiList, setDesiList] = useState<{ id: string; name: string; price: number }[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string; depth: number }[]>([])
  const [categoryId, setCategoryId] = useState<string>("")

  // Özellik (specifications)
  const [specGroups, setSpecGroups] = useState<{ id: string; name: string; children: { id: string; name: string }[] }[]>([])
  const [selectedSpecGroupId, setSelectedSpecGroupId] = useState<string>("")
  const [selectedSpecId, setSelectedSpecId] = useState<string>("")
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [specModalOpen, setSpecModalOpen] = useState(false)
  const [newSpecName, setNewSpecName] = useState("")
  const [newSpecGroupId, setNewSpecGroupId] = useState("")
  const [groupComboOpen, setGroupComboOpen] = useState(false)
  const [specComboOpen, setSpecComboOpen] = useState(false)
  const [newSpecGroupComboOpen, setNewSpecGroupComboOpen] = useState(false)

  const loadSpecGroups = async () => {
    try {
      const res = await specificationService.getAll()
      if (res.success && res.data) {
        setSpecGroups(
          res.data.map((g: any) => ({
            id: String(g.id),
            name: g.name,
            children: (g.children || []).map((c: any) => ({ id: String(c.id), name: c.name })),
          }))
        )
      }
    } catch {}
  }

  useEffect(() => { loadSpecGroups() }, [])

  const handleAddSpec = () => {
    if (!selectedSpecId) {
      toast({ title: "Hata", description: "Özellik seçilmelidir", variant: "destructive" })
      return
    }
    const group = specGroups.find(g => g.id === selectedSpecGroupId)
    const spec = group?.children.find(c => c.id === selectedSpecId)
    if (!spec || !group) return
    if (product.technicalSpecs.some(s => s.key === spec.name && s.groupName === group.name)) {
      toast({ title: "Bilgi", description: "Bu özellik zaten ekli" })
      return
    }
    setProduct({
      ...product,
      technicalSpecs: [...product.technicalSpecs, { key: spec.name, value: "", groupName: group.name }],
    })
    setSelectedSpecId("")
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast({ title: "Hata", description: "Grup adı boş olamaz", variant: "destructive" })
      return
    }
    try {
      const res = await specificationService.createGroup({ name: newGroupName.trim() })
      if (res.success && res.data) {
        toast({ title: "Başarılı", description: "Grup oluşturuldu" })
        const newId = String(res.data.id)
        setNewGroupName("")
        setGroupModalOpen(false)
        await loadSpecGroups()
        setSelectedSpecGroupId(newId)
        setSelectedSpecId("")
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Grup oluşturulamadı", variant: "destructive" })
    }
  }

  const handleCreateSpec = async () => {
    if (!newSpecName.trim() || !newSpecGroupId) {
      toast({ title: "Hata", description: "Grup ve özellik adı zorunludur", variant: "destructive" })
      return
    }
    try {
      const res = await specificationService.create({ name: newSpecName.trim(), groupId: newSpecGroupId })
      if (res.success && res.data) {
        toast({ title: "Başarılı", description: "Özellik oluşturuldu" })
        const newSpecIdVal = String(res.data.id)
        const targetGroupId = newSpecGroupId
        setNewSpecName("")
        setNewSpecGroupId("")
        setSpecModalOpen(false)
        await loadSpecGroups()
        setSelectedSpecGroupId(targetGroupId)
        setSelectedSpecId(newSpecIdVal)
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Özellik oluşturulamadı", variant: "destructive" })
    }
  }

  // Canlı fiyat breakdown (API'den)
  const [kategoriOran, setKategoriOran] = useState<number | null>(null)

  // Backend'den canlı kategori oranı çek (kademe seçimi)
  useEffect(() => {
    if (!categoryId || !product.supplierCost) { setKategoriOran(null); return }
    const desiRecord = desiList.find(d => d.name === product.desi)
    const desiPrice = desiRecord ? Number(desiRecord.price) : 0
    const t = setTimeout(() => {
      productService.calculatePrice({
        tedarikciFiyat: Number(product.supplierCost),
        categoryId,
        supplierDiscount: Number(product.productDiscount) || 0,
        desiPrice,
      }).then(res => {
        if (res.success && res.data) setKategoriOran(res.data.kategoriOran)
      }).catch(() => setKategoriOran(null))
    }, 400)
    return () => clearTimeout(t)
  }, [product.supplierCost, product.productDiscount, product.desi, categoryId, desiList])

  // Hesaplanmış fiyatlar — pricing.ts mantığıyla uyumlu (indirim → kademe → kâr → desi)
  const computedPrices = useMemo(() => {
    const tedarikciFiyat = Number(product.supplierCost) || 0
    const discount = Number(product.productDiscount) || 0
    const desiRecord = desiList.find(d => d.name === product.desi)
    const desiPrice = desiRecord ? Number(desiRecord.price) : 0
    const discountAmount = tedarikciFiyat * discount / 100
    const cashDiscountCost = tedarikciFiyat - discountAmount  // baseFiyat
    const oran = kategoriOran ?? 0
    const profitMarkup = cashDiscountCost * oran / 100  // kategori kademe kârı
    const noCampaignCost = cashDiscountCost
    const campaignDiscountCost = cashDiscountCost * 0.95
    const shippingCost = cashDiscountCost + desiPrice
    // Eski projedeki formül: bolbolbulFiyat = baseFiyat + (baseFiyat * oran/100) + desi
    const finalSalesPrice = cashDiscountCost + profitMarkup + desiPrice
    const profitAmount = product.bbbSalesPrice - shippingCost
    const profitPercent = shippingCost > 0 ? (profitAmount / shippingCost) * 100 : 0
    return { cashDiscountCost, noCampaignCost, campaignDiscountCost, shippingCost, profitAmount, profitPercent, desiPrice, discountAmount, profitMarkup, finalSalesPrice }
  }, [product.supplierCost, product.productDiscount, product.desi, product.bbbSalesPrice, desiList, kategoriOran])

  // Hesaplanan fiyatı tüm satış kanallarına otomatik yansıt (eski projedeki calculateProductPrice davranışı)
  useEffect(() => {
    if (!kategoriOran || !product.supplierCost) return
    const v = Number(computedPrices.finalSalesPrice.toFixed(2))
    setProduct(prev => {
      if (
        prev.bbbSalesPrice === v &&
        prev.sopvoCost === v &&
        prev.n11Cost === v &&
        prev.trendyolCost === v &&
        prev.hepsiburadaCost === v &&
        prev.pazaramaCost === v
      ) return prev
      return {
        ...prev,
        bbbSalesPrice: v,
        sopvoCost: v,
        n11Cost: v,
        trendyolCost: v,
        hepsiburadaCost: v,
        pazaramaCost: v,
      }
    })
  }, [computedPrices.finalSalesPrice, kategoriOran, product.supplierCost])

  // Master data yükle
  useEffect(() => {
    Promise.all([
      desiService.getAll(),
      categoryService.getTree(),
    ]).then(([dRes, cRes]) => {
      if (dRes.success && dRes.data) setDesiList(dRes.data)
      if (cRes.success && cRes.data) {
        const flatten = (nodes: any[], depth = 0): { id: string; name: string; depth: number }[] => {
          const out: any[] = []
          for (const n of nodes) {
            out.push({ id: n.id, name: n.name, depth })
            if (n.children?.length) out.push(...flatten(n.children, depth + 1))
          }
          return out
        }
        setCategories(flatten(cRes.data))
      }
    }).catch(() => {})
  }, [])

  // YENİ ÜRÜN: tedarikci_urunler'den prefill (Ekle butonu ile geldi)
  useEffect(() => {
    if (!isNew || !supplierProductIdParam) return
    setLoadingProduct(true)
    supplierProductService.getById(supplierProductIdParam).then(res => {
      if (res.success && res.data) {
        const sp = res.data
        const stockNum = sp.stock ?? 0
        setProduct(prev => ({
          ...prev,
          name: sp.productTitle || "",
          supplier: sp.supplierName || "",
          brand: sp.brand || "",
          sku: sp.productCode || "",
          barcode: generateBarcode(),
          kdv: "20",
          isActive: true,
          eCommerce: true,
          marketplace: false,
          supplierCost: sp.netPriceWithVAT ?? 0,
          productDiscount: 0,
          stock: { supplier: stockNum, our: 0, bolbolbul: stockNum, sopvo: stockNum },
        }))
        // Görsel: tek string, virgülle ayrılmış olabilir
        if (sp.productPictures) {
          const imgs = sp.productPictures.split(',').map(s => s.trim()).filter(Boolean)
          setProductImages(imgs)
        }
      }
    }).catch(() => {
      toast({ title: "Hata", description: "Tedarikçi ürünü yüklenemedi", variant: "destructive" })
    }).finally(() => setLoadingProduct(false))
  }, [isNew, supplierProductIdParam])

  // Ürünü API'den yükle — tüm değerler API'den, mock yok
  useEffect(() => {
    if (id === 'new') { setLoadingProduct(false); return }
    productService.getById(id).then(res => {
      if (res.success && res.data) {
        const p = res.data
        setProduct(prev => ({
          ...prev,
          name: p.name || "",
          supplier: p.supplier || "",
          brand: p.brand || "",
          sku: p.stockCode || "",
          barcode: p.barcode || "",
          desi: p.desi != null ? String(p.desi) : "",
          kdv: String(p.kdv || 20),
          isActive: !!p.isActive,
          eCommerce: !!p.eticaret,
          marketplace: !!p.sopyo,
          supplierCost: p.tedarikciFiyat ?? 0,
          productDiscount: p.productDiscount ?? 0,
          bbbSalesPrice: p.bolbolbulFiyat ?? 0,
          sopvoCost: p.sopyoFiyat ?? 0,
          n11Cost: p.n11Fiyat ?? 0,
          trendyolCost: p.trendyolFiyat ?? 0,
          hepsiburadaCost: p.hepsiburadaFiyat ?? 0,
          pazaramaCost: p.pazaramaFiyat ?? 0,
          stock: {
            supplier: p.toplamStock ?? 0,
            our: p.bizimhesapStock ?? 0,
            bolbolbul: p.bolbolbulStock ?? 0,
            sopvo: p.sopyoStock ?? 0,
          },
          metaTitle: p.metaTitle || "",
          metaDescription: p.metaDescription || "",
          description: p.detayBilgileri || "",
          technicalSpecs: (p.attributes || []).map((a: any) => ({ key: a.Name, value: a.Value || "", groupName: a.Group || "Diğer" })),
        }))
        setProductImages(p.images && p.images.length > 0 ? p.images : [])
        if (p.categoryId) setCategoryId(p.categoryId)
      }
    }).catch(() => {
      toast({ title: "Hata", description: "Ürün yüklenemedi", variant: "destructive" })
    }).finally(() => setLoadingProduct(false))
  }, [id])

  const handleSave = async () => {
    if (isNew && !categoryId) {
      toast({ title: "Hata", description: "Kategori seçimi zorunludur", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        name: product.name,
        stockCode: product.sku,
        supplier: product.supplier,
        brand: product.brand,
        barcode: product.barcode,
        kdv: parseInt(product.kdv),
        eticaret: product.isActive,
        sopyo: product.marketplace,
        sendEticaretCheck: product.eCommerce,
        sendSopyoCheck: product.marketplace,
        tedarikciFiyat: product.supplierCost,
        productDiscount: product.productDiscount,
        bolbolbulFiyat: product.bbbSalesPrice,
        sopyoFiyat: product.sopvoCost,
        n11Fiyat: product.n11Cost,
        trendyolFiyat: product.trendyolCost,
        hepsiburadaFiyat: product.hepsiburadaCost,
        pazaramaFiyat: product.pazaramaCost,
        toplamStock: product.stock.supplier,
        bolbolbulStock: product.stock.bolbolbul,
        sopyoStock: product.stock.sopvo,
        bizimhesapStock: product.stock.our,
        metaTitle: product.metaTitle,
        metaDescription: product.metaDescription,
        detayBilgileri: product.description,
        attributes: product.technicalSpecs.map((s: any) => ({ Name: s.key, Value: s.value || "", Group: s.groupName || "" })),
        images: productImages,
        ...(categoryId ? { categoryId } : {}),
        ...(product.desi ? { desi: parseFloat(product.desi) } : {}),
      }

      if (isNew) {
        // Yeni ürün — tedarikciProductId varsa supplier_product'tan envantere alınıyor
        if (supplierProductIdParam) {
          payload.tedarikciProductId = supplierProductIdParam
        }
        const res = await productService.create(payload)
        if (res.success && res.data) {
          toast({ title: "Başarılı", description: "Ürün envantere eklendi" })
          router.replace(`/products/edit/${res.data.id}`)
        } else {
          throw new Error('Oluşturulamadı')
        }
      } else {
        await productService.update(id, payload)
        toast({ title: "Başarılı", description: "Ürün başarıyla güncellendi" })
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Ürün kaydedilemedi", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const [uploadingImages, setUploadingImages] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    console.log('[image-upload] handleFileSelect tetiklendi, files count:', files?.length || 0)
    if (!files || files.length === 0) return

    const MAX_SIZE = 5 * 1024 * 1024 // 5 MB (backend ile uyumlu)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

    // ÖNCE files reference'ı al — modal kapanırken DOM unmount olsa bile bu reference yaşar
    const fileList = Array.from(files)
    setUploadingImages(true)
    setIsImageModalOpen(false)
    try { e.target.value = '' } catch {}

    let okCount = 0
    let failCount = 0

    for (const file of fileList) {
      console.log('[image-upload] yükleniyor:', file.name, file.type, file.size, 'bytes')
      try {
        if (!allowedTypes.includes(file.type)) {
          const msg = `Desteklenmeyen dosya türü: ${file.name} (${file.type || 'bilinmiyor'})`
          console.error('[image-upload]', msg)
          toast({ title: "Yükleme hatası", description: msg, variant: "destructive" })
          failCount++
          continue
        }
        if (file.size > MAX_SIZE) {
          const msg = `${file.name} çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB) — max 5 MB`
          console.error('[image-upload]', msg)
          toast({ title: "Yükleme hatası", description: msg, variant: "destructive" })
          failCount++
          continue
        }

        // API'ye upload — base64 yerine sunucuda dosyaya kaydedilir, DB'ye sadece URL gider
        const res = await uploadService.uploadSingleImage(file, 'product')
        console.log('[image-upload] response:', res)
        const url = (res as any)?.data?.data?.url || (res as any)?.data?.url
        if (!url) {
          throw new Error('Upload başarılı ama URL dönmedi: ' + JSON.stringify(res).slice(0, 200))
        }
        setProductImages((prev) => [...prev, url])
        okCount++
      } catch (err: any) {
        const msg = `${file.name}: ${err?.message || err?.toString() || 'bilinmeyen hata'}`
        console.error('[image-upload] hata:', err)
        toast({ title: "Yükleme hatası", description: msg, variant: "destructive" })
        failCount++
      }
    }

    setUploadingImages(false)
    if (okCount > 0) {
      toast({ title: "Yükleme tamamlandı", description: `${okCount} görsel yüklendi${failCount ? `, ${failCount} hata` : ''}` })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    // handleFileSelect ile aynı doğrulama + hata yakalama yolunu paylaşmak için
    // synthetic event üret
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return
    const fakeEvent = { target: { files, value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>
    handleFileSelect(fakeEvent)
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/products">
                  <Button variant="ghost" size="icon" className="rounded-lg">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                    <span>{product.supplier || "Tedarikçi"}</span>
                    <ChevronRight className="h-3 w-3" />
                    <span className="truncate max-w-md">{product.sku || product.barcode || "Yeni Ürün"}</span>
                  </div>
                  <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {loadingProduct ? "Yükleniyor..." : (product.name || "Ürün Düzenle")}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white rounded-lg px-6"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Güncelle
                </Button>
                <Button
                  onClick={() => {
                    handleSave()
                    window.history.back()
                  }}
                  className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white rounded-lg px-6"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Güncelle ve Kapat
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
          {/* Ürün Bilgileri ve Görsel */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sol - Ürün Görseli */}
                <div className="space-y-4">
                  <div className="relative aspect-square bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center overflow-hidden group">
                    {uploadingImages && (
                      <div className="absolute inset-0 z-30 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white">
                        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">Görseller yükleniyor...</span>
                      </div>
                    )}
                    {productImages.length > 0 ? (
                      <>
                        <img
                          src={productImages[selectedImageIndex]}
                          alt="Product"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setImageDeleteIndex(selectedImageIndex)}
                          title="Bu görseli sil"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white rounded-md p-1.5 shadow-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-slate-400">
                        <ImageIcon className="h-12 w-12 mb-2" />
                        <span className="text-xs">Görsel yok</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {productImages.map((image, index) => (
                      <div
                        key={index}
                        className={`relative group w-16 h-16 border-2 rounded-lg overflow-hidden cursor-pointer transition-colors ${
                          selectedImageIndex === index
                            ? 'border-blue-500'
                            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Thumb ${index + 1}`}
                          className="w-full h-full object-cover"
                          onClick={() => setSelectedImageIndex(index)}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setImageDeleteIndex(index)
                          }}
                          title="Görseli sil"
                          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white rounded p-0.5 shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setIsImageModalOpen(true)}
                      className="w-16 h-16 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
                      title="Görsel ekle"
                    >
                      <Plus className="h-5 w-5 text-slate-400" />
                    </button>
                  </div>
                </div>

                {/* Sağ - Form Alanları */}
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Ürün Adı</Label>
                    <div className="relative">
                      <Input
                        value={product.name}
                        onChange={(e) => setProduct({ ...product, name: e.target.value })}
                        className="pr-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                      />
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded">
                        <Edit className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Tedarikçi</Label>
                      <Input
                        value={product.supplier || "—"}
                        disabled
                        className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg cursor-not-allowed opacity-60"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Marka</Label>
                      <Input
                        value={product.brand}
                        disabled
                        className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg cursor-not-allowed opacity-60"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Stok Kodu (SKU)</Label>
                      <Input
                        value={product.sku}
                        disabled
                        className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg cursor-not-allowed opacity-60"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Barkod Kodu</Label>
                      <Input
                        value={product.barcode}
                        disabled
                        className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg cursor-not-allowed opacity-60"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-[1.35fr_0.825fr_0.825fr] gap-4">
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Desi</Label>
                      <Select value={product.desi} onValueChange={(value) => setProduct({ ...product, desi: value })}>
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg">
                          <SelectValue placeholder="Desi seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {desiList.map(d => (
                            <SelectItem key={d.id} value={d.name}>{d.name} — ₺{d.price}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">KDV</Label>
                      <Select value={product.kdv} onValueChange={(value) => setProduct({ ...product, kdv: value })}>
                        <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">%1</SelectItem>
                          <SelectItem value="10">%10</SelectItem>
                          <SelectItem value="20">%20</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={product.isActive}
                          onCheckedChange={(checked) => setProduct({ ...product, isActive: checked })}
                          className="scale-125 data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-600 data-[state=checked]:via-violet-600 data-[state=checked]:to-indigo-600"
                        />
                        <Label className="text-xs">Envanter Durumu</Label>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Kategori Seçimi */}
                  <div className="mt-5">
                    <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Kategori</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg">
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {"— ".repeat(c.depth)}{c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Teknik Özellikler - Tam Genişlik */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-[1fr_2fr] gap-6">
                  {/* Sol - Form */}
                  <div className="space-y-3">
                    <div className="w-full">
                      <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Özellik Grubu Seçin</Label>
                      <Popover open={groupComboOpen} onOpenChange={setGroupComboOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={groupComboOpen}
                            className="w-full justify-between bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 font-normal"
                          >
                            {selectedSpecGroupId
                              ? specGroups.find(g => g.id === selectedSpecGroupId)?.name
                              : "Özellik Grubu Seçiniz"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Grup ara..." />
                            <CommandList>
                              <CommandEmpty>Grup bulunamadı</CommandEmpty>
                              <CommandGroup>
                                {specGroups.map((g) => (
                                  <CommandItem
                                    key={g.id}
                                    value={g.name}
                                    onSelect={() => {
                                      setSelectedSpecGroupId(g.id)
                                      setSelectedSpecId("")
                                      setGroupComboOpen(false)
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", selectedSpecGroupId === g.id ? "opacity-100" : "opacity-0")} />
                                    {g.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <button
                      type="button"
                      onClick={() => setGroupModalOpen(true)}
                      className="w-full min-h-[36px] max-h-[36px] h-9 px-3 inline-flex items-center justify-center text-sm font-medium rounded-md border border-green-200/40 dark:border-green-800/40 bg-gradient-to-r from-green-50/40 to-emerald-50/40 dark:from-green-950/40 dark:to-emerald-950/40 hover:from-green-100/50 hover:to-emerald-100/50 dark:hover:from-green-900/50 dark:hover:to-emerald-900/50 hover:border-green-300/50 dark:hover:border-green-700/50 text-green-700 dark:text-green-400 transition-colors leading-none"
                    >
                      Grup Oluştur
                    </button>

                    <Separator className="my-4" />

                    <div className="w-full">
                      <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Özellik Seçin</Label>
                      <Popover open={specComboOpen} onOpenChange={setSpecComboOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={specComboOpen}
                            disabled={!selectedSpecGroupId}
                            className="w-full justify-between bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg h-9 font-normal"
                          >
                            {selectedSpecId
                              ? specGroups.find(g => g.id === selectedSpecGroupId)?.children.find(c => c.id === selectedSpecId)?.name
                              : (selectedSpecGroupId ? "Özellik Seçiniz" : "Önce grup seçin")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Özellik ara..." />
                            <CommandList>
                              <CommandEmpty>Özellik bulunamadı</CommandEmpty>
                              <CommandGroup>
                                {(specGroups.find(g => g.id === selectedSpecGroupId)?.children || []).map((c) => (
                                  <CommandItem
                                    key={c.id}
                                    value={c.name}
                                    onSelect={() => {
                                      setSelectedSpecId(c.id)
                                      setSpecComboOpen(false)
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", selectedSpecId === c.id ? "opacity-100" : "opacity-0")} />
                                    {c.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setNewSpecGroupId(selectedSpecGroupId)
                        setSpecModalOpen(true)
                      }}
                      className="w-full min-h-[36px] max-h-[36px] h-9 px-3 inline-flex items-center justify-center text-sm font-medium rounded-md border border-orange-200/40 dark:border-orange-800/40 bg-gradient-to-r from-orange-50/40 to-amber-50/40 dark:from-orange-950/40 dark:to-amber-950/40 hover:from-orange-100/50 hover:to-amber-100/50 dark:hover:from-orange-900/50 dark:hover:to-amber-900/50 hover:border-orange-300/50 dark:hover:border-orange-700/50 text-orange-700 dark:text-orange-400 transition-colors leading-none"
                    >
                      Özellik Oluştur
                    </button>

                    <div className="pt-4">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddSpec}
                        className="w-3/4 mx-auto flex items-center gap-2 h-9 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:via-violet-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md transition-all"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ekle
                      </Button>
                    </div>
                  </div>

                  {/* Sağ - Liste (gruplandırılmış) */}
                  <div className="space-y-4">
                    <Label className="text-xs text-slate-500 dark:text-slate-400">Seçilen Özellikler</Label>
                    {product.technicalSpecs.length === 0 ? (
                      <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                        Henüz özellik eklenmedi
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(
                          product.technicalSpecs.reduce<Record<string, { spec: { key: string; value: string; groupName?: string }; index: number }[]>>((acc, spec, index) => {
                            const g = spec.groupName || "Diğer"
                            if (!acc[g]) acc[g] = []
                            acc[g].push({ spec, index })
                            return acc
                          }, {})
                        ).map(([groupName, items]) => (
                          <div key={groupName} className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border-b border-slate-200 dark:border-slate-800">
                              <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                                {groupName}
                              </h4>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                              {items.map(({ spec, index }) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between px-3 py-2 group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                  <span className="text-xs text-slate-700 dark:text-slate-300">
                                    {spec.key}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeTechnicalSpec(index)}
                                    className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fiyatlandırma ve Stok Bilgileri */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="space-y-8">
                {/* Üst - Fiyatlandırma (Grid 2 sütun) */}
                <div className="grid grid-cols-2 gap-8">
                  {/* Sol - Maliyet Fiyatları */}
                  <div className="space-y-4">
                    <div className="p-5 rounded-xl bg-gradient-to-br from-red-50/40 via-rose-50/30 to-orange-50/40 dark:from-red-950/20 dark:via-rose-950/15 dark:to-orange-950/20 border border-red-100/50 dark:border-red-900/30">
                      <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Maliyet Fiyatları
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs text-red-600/70 dark:text-red-400/70 mb-1.5 block">Tedarikçi Maliyet</Label>
                          <Input
                            type="number"
                            value={product.supplierCost}
                            disabled
                            className="bg-red-50/40 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/50 rounded-lg cursor-not-allowed opacity-70"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-red-600/70 dark:text-red-400/70 mb-1.5 block">
                            İskonto Sonrası Maliyet
                            {product.productDiscount > 0 && <span className="text-[10px] ml-1">(%{product.productDiscount} indirim)</span>}
                          </Label>
                          <Input
                            type="number"
                            value={computedPrices.cashDiscountCost.toFixed(2)}
                            disabled
                            className="bg-red-50/40 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/50 rounded-lg cursor-not-allowed opacity-70"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-red-600/70 dark:text-red-400/70 mb-1.5 block">Kargo Dahil Maliyet</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={computedPrices.shippingCost.toFixed(2)}
                              disabled
                              className="bg-red-50/40 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/50 rounded-lg cursor-not-allowed opacity-70"
                            />
                            {computedPrices.desiPrice > 0 && (
                              <span className="text-[10px] px-2.5 py-1.5 rounded-md bg-red-100/60 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-semibold whitespace-nowrap border border-red-200/50 dark:border-red-800/50">
                                +₺{computedPrices.desiPrice}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stok Bilgileri — Maliyet Fiyatlarının altında */}
                    <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50/40 via-indigo-50/30 to-purple-50/40 dark:from-blue-950/20 dark:via-indigo-950/15 dark:to-purple-950/20 border border-blue-100/50 dark:border-blue-900/30">
                      <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        Stok Bilgileri
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-blue-600/70 dark:text-blue-400/70 mb-1.5 block">Toplam Stok</Label>
                          <Input
                            type="number"
                            value={product.stock.supplier}
                            onChange={(e) => setProduct({ ...product, stock: { ...product.stock, supplier: Number(e.target.value) } })}
                            className="bg-white/60 dark:bg-slate-900/60 border-blue-200/50 dark:border-blue-800/50 rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-blue-600/70 dark:text-blue-400/70 mb-1.5 block">BBB Stok</Label>
                          <Input
                            type="number"
                            value={product.stock.bolbolbul}
                            onChange={(e) => setProduct({ ...product, stock: { ...product.stock, bolbolbul: Number(e.target.value) } })}
                            className="bg-white/60 dark:bg-slate-900/60 border-blue-200/50 dark:border-blue-800/50 rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-blue-600/70 dark:text-blue-400/70 mb-1.5 block">Sopyo Stok</Label>
                          <Input
                            type="number"
                            value={product.stock.sopvo}
                            onChange={(e) => setProduct({ ...product, stock: { ...product.stock, sopvo: Number(e.target.value) } })}
                            className="bg-white/60 dark:bg-slate-900/60 border-blue-200/50 dark:border-blue-800/50 rounded-lg"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-blue-600/70 dark:text-blue-400/70 mb-1.5 block">Bizim Hesap Stok</Label>
                          <Input
                            type="number"
                            value={product.stock.our}
                            onChange={(e) => setProduct({ ...product, stock: { ...product.stock, our: Number(e.target.value) } })}
                            className="bg-white/60 dark:bg-slate-900/60 border-blue-200/50 dark:border-blue-800/50 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sağ - Satış Fiyatları */}
                  <div className="space-y-4">

                    {/* Fiyat Hesaplama Breakdown */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 dark:from-slate-900 dark:via-blue-950/30 dark:to-indigo-950/30 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                          Fiyat Hesaplaması
                        </h3>
                        {!categoryId && <span className="text-[10px] text-amber-600">Kategori seçilmeli</span>}
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Tedarikçi Fiyatı</span>
                          <span className="font-mono font-medium">₺{Number(product.supplierCost || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {product.productDiscount > 0 && (
                          <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                            <span>İskonto (%{product.productDiscount})</span>
                            <span className="font-mono">−₺{computedPrices.discountAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Net Maliyet</span>
                          <span className="font-mono font-semibold">₺{computedPrices.cashDiscountCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {kategoriOran !== null && kategoriOran > 0 && (
                          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                            <span>
                              Kategori Kademe Kârı
                              <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-[10px] font-semibold">
                                %{kategoriOran}
                              </span>
                            </span>
                            <span className="font-mono">+₺{computedPrices.profitMarkup.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {computedPrices.desiPrice > 0 && (
                          <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
                            <span>
                              Desi Kargo
                              <span className="ml-1 px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/40 text-[10px] font-semibold">
                                {product.desi}
                              </span>
                            </span>
                            <span className="font-mono">+₺{computedPrices.desiPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {kategoriOran !== null && (
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-300 dark:border-slate-700">
                            <span className="text-blue-700 dark:text-blue-400 font-semibold">BBB Hesaplanan</span>
                            <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                              ₺{(computedPrices.cashDiscountCost + computedPrices.profitMarkup + computedPrices.desiPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-5 rounded-xl bg-gradient-to-br from-green-50/40 via-emerald-50/30 to-teal-50/40 dark:from-green-950/20 dark:via-emerald-950/15 dark:to-teal-950/20 border border-green-100/50 dark:border-green-900/30">
                      <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Satış Fiyatları
                        {kategoriOran !== null && (
                          <span className="ml-auto text-[10px] font-normal text-green-600/70 dark:text-green-400/70">
                            Kademe: %{kategoriOran}
                          </span>
                        )}
                      </h3>
                      <div>
                        <Label className="text-xs text-green-600/70 dark:text-green-400/70 mb-1.5 block flex items-center justify-between">
                          <span>BBB Satış Fiyatı</span>
                          <span className="text-[10px] text-green-600/50">otomatik hesaplanır, düzenlenebilir</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={product.bbbSalesPrice}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0
                            setProduct({
                              ...product,
                              bbbSalesPrice: v,
                              sopvoCost: v,
                              n11Cost: v,
                              trendyolCost: v,
                              hepsiburadaCost: v,
                              pazaramaCost: v,
                            })
                          }}
                          className="bg-white dark:bg-slate-900 border-green-300 dark:border-green-700 rounded-lg font-semibold text-base"
                        />
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Kar Marjı Raporu */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/40 via-yellow-50/30 to-orange-50/40 dark:from-amber-950/20 dark:via-yellow-950/15 dark:to-orange-950/20 border border-amber-100/50 dark:border-amber-900/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Tahmini Kâr Marjı</span>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-xl font-bold ${computedPrices.profitAmount >= 0 ? 'text-amber-900 dark:text-amber-200' : 'text-red-700 dark:text-red-400'}`}>
                            ₺{computedPrices.profitAmount.toFixed(2)}
                          </span>
                          <span className={`text-sm font-semibold px-2 py-0.5 rounded ${computedPrices.profitPercent >= 20 ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : computedPrices.profitPercent >= 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'}`}>
                            {computedPrices.shippingCost > 0 ? `%${computedPrices.profitPercent.toFixed(1)}` : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-amber-600/70 dark:text-amber-400/70 grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1 border-t border-amber-100/50 dark:border-amber-900/30">
                        <span>Satış:</span><span className="text-right font-mono">₺{product.bbbSalesPrice.toFixed(2)}</span>
                        <span>Maliyet+Desi:</span><span className="text-right font-mono">−₺{computedPrices.shippingCost.toFixed(2)}</span>
                      </div>
                    </div>

                  </div>
                </div>

                {product.previousCampaigns.length > 0 && <Separator className="my-6" />}

                {/* Son Uygulanan Kampanyalar — sadece veri varsa göster */}
                {product.previousCampaigns.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Son Uygulanan Kampanyalar</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {product.previousCampaigns.map((campaign, index) => {
                      const isActive = campaign.status === "active"
                      return (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isActive
                              ? "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                              : "bg-slate-50/40 dark:bg-slate-950/40 border-slate-200/40 dark:border-slate-800/40 opacity-60"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Calendar className="h-3 w-3" />
                                <span>{campaign.date}</span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isActive
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              }`}>
                                {isActive ? "Devam Ediyor" : "Süresi Doldu"}
                              </span>
                            </div>
                            <div className="text-sm font-medium">{campaign.discount} indirim</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500">Kampanya Fiyatı</div>
                            <div className={`text-base font-bold ${
                              isActive ? "text-green-600 dark:text-green-500" : "text-slate-400 dark:text-slate-600"
                            }`}>
                              ₺{campaign.price.toLocaleString('tr-TR')}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SEO ve Ürün İçeriği */}
          <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardContent className="p-6 space-y-6">
              {/* Meta Title */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Meta Title</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{product.metaTitle.length}/60</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={aiGenerating !== null}
                      onClick={() => generateWithAI('metaTitle')}
                      className="text-xs h-7 px-2"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {aiGenerating === 'metaTitle' || aiGenerating === 'metaDescription' ? '...' : 'AI'}
                    </Button>
                  </div>
                </div>
                <Input
                  value={product.metaTitle}
                  onChange={(e) => setProduct({ ...product, metaTitle: e.target.value })}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                />
              </div>

              <Separator />

              {/* Meta Description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Meta Description</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{product.metaDescription.length}/160</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={aiGenerating !== null}
                      onClick={() => generateWithAI('metaDescription')}
                      className="text-xs h-7 px-2"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={product.metaDescription}
                  onChange={(e) => setProduct({ ...product, metaDescription: e.target.value })}
                  rows={3}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs resize-none"
                />
              </div>

              <Separator />

              {/* Ürün Açıklaması */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Ürün Açıklaması</Label>
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={aiGenerating !== null}
                      onClick={() => generateWithAI('description', 150)}
                      className="text-[10px] h-7 px-2"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {aiGenerating === 'description' ? '...' : '150'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={aiGenerating !== null}
                      onClick={() => generateWithAI('description', 300)}
                      className="text-[10px] h-7 px-2"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      300
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={aiGenerating !== null}
                      onClick={() => generateWithAI('description', 400)}
                      className="text-[10px] h-7 px-2"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      400
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={product.description}
                  onChange={(e) => setProduct({ ...product, description: e.target.value })}
                  rows={10}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs resize-none"
                  placeholder="Ürün detaylarını buraya yazın..."
                />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Alt Butonlar - Sticky */}
      <div className="sticky bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-700 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-end gap-4">
            <Button
              onClick={handleSave}
              className="h-11 px-8 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              <Save className="h-4 w-4 mr-2" />
              Güncelle
            </Button>
            <Button
              onClick={() => {
                handleSave()
                // Sonra sayfayı kapat veya yönlendir
                window.history.back()
              }}
              className="h-11 px-8 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Güncelle ve Kapat
            </Button>
          </div>
        </div>
      </div>

      {/* Resim Yükleme Modalı */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resim Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Sürükle Bırak Alanı */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-slate-300 dark:border-slate-700 hover:border-primary/50"
              )}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Resimleri buraya sürükleyin
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    veya dosya seçmek için tıklayın
                  </p>
                </div>
              </div>
            </div>

            {/* Dosya Seç Butonu */}
            <div className="relative">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button className="w-full bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:via-violet-700 hover:to-indigo-700 text-white">
                <Upload className="h-4 w-4 mr-2" />
                Dosya Seç
              </Button>
            </div>

            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              PNG, JPG, WEBP formatları desteklenir (Max. 5MB)
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Görsel Silme Onayı */}
      <Dialog open={imageDeleteIndex !== null} onOpenChange={(open) => !open && setImageDeleteIndex(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Görseli sil?</DialogTitle>
            <DialogDescription>
              Bu görsel kalıcı olarak silinecek. {isNew ? "" : "Bu işlem hemen kaydedilecek ve geri alınamaz."}
            </DialogDescription>
          </DialogHeader>
          {imageDeleteIndex !== null && productImages[imageDeleteIndex] && (
            <div className="flex justify-center py-2">
              <img
                src={productImages[imageDeleteIndex]}
                alt="Silinecek"
                className="max-h-48 rounded-lg border border-slate-200 dark:border-slate-700 object-contain"
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setImageDeleteIndex(null)}
              disabled={imageDeleting}
            >
              Vazgeç
            </Button>
            <Button
              onClick={confirmDeleteImage}
              disabled={imageDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {imageDeleting ? "Siliniyor..." : "Evet, sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yeni Özellik Grubu Modalı */}
      <Dialog open={groupModalOpen} onOpenChange={setGroupModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Özellik Grubu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Grup Adı</Label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Örn: Teknik Detaylar"
                className="w-full"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateGroup() } }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setGroupModalOpen(false)}>İptal</Button>
              <Button
                onClick={handleCreateGroup}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Yeni Özellik Modalı */}
      <Dialog open={specModalOpen} onOpenChange={setSpecModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Özellik</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Grup</Label>
              <Popover open={newSpecGroupComboOpen} onOpenChange={setNewSpecGroupComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={newSpecGroupComboOpen}
                    className="w-full justify-between font-normal"
                  >
                    {newSpecGroupId
                      ? specGroups.find(g => g.id === newSpecGroupId)?.name
                      : "Grup seçiniz"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Grup ara..." />
                    <CommandList>
                      <CommandEmpty>Grup bulunamadı</CommandEmpty>
                      <CommandGroup>
                        {specGroups.map((g) => (
                          <CommandItem
                            key={g.id}
                            value={g.name}
                            onSelect={() => {
                              setNewSpecGroupId(g.id)
                              setNewSpecGroupComboOpen(false)
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", newSpecGroupId === g.id ? "opacity-100" : "opacity-0")} />
                            {g.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Özellik Adı</Label>
              <Input
                value={newSpecName}
                onChange={(e) => setNewSpecName(e.target.value)}
                placeholder="Örn: Renk, Voltaj, Boyut"
                className="w-full"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSpec() } }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSpecModalOpen(false)}>İptal</Button>
              <Button
                onClick={handleCreateSpec}
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
              >
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}
