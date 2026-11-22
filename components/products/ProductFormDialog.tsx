"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Info,
  DollarSign,
  Search,
  List,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react"
import {
  productService,
  categoryService,
  desiService,
  supplierService,
} from "@/lib/api"
import type {
  Product,
  CreateProductDto,
  CategoryTree,
  DesiFrontend,
  Supplier,
} from "@/lib/api/types"

// --- Helpers ---

function flattenTree(
  nodes: CategoryTree[],
  depth = 0
): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = []
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, depth })
    if (node.children?.length) {
      result.push(...flattenTree(node.children, depth + 1))
    }
  }
  return result
}

// --- Types ---

interface FormData {
  name: string
  supplier: string
  stockCode: string
  brand: string
  barcode: string
  desi: string
  categoryId: string
  tedarikciFiyat: string
  productDiscount: string
  bolbolbulFiyat: string
  sopyoFiyat: string
  n11Fiyat: string
  trendyolFiyat: string
  hepsiburadaFiyat: string
  pazaramaFiyat: string
  toplamStock: string
  bolbolbulStock: string
  sopyoStock: string
  kdv: string
  eticaret: boolean
  sopyo: boolean
  isFiyatTercih: boolean
  metaTitle: string
  metaDescription: string
  detayBilgileri: string
  attributes: { Name: string; Value: string }[]
}

const EMPTY_FORM: FormData = {
  name: "",
  supplier: "",
  stockCode: "",
  brand: "",
  barcode: "",
  desi: "",
  categoryId: "",
  tedarikciFiyat: "",
  productDiscount: "",
  bolbolbulFiyat: "",
  sopyoFiyat: "",
  n11Fiyat: "",
  trendyolFiyat: "",
  hepsiburadaFiyat: "",
  pazaramaFiyat: "",
  toplamStock: "0",
  bolbolbulStock: "0",
  sopyoStock: "0",
  kdv: "20",
  eticaret: true,
  sopyo: false,
  isFiyatTercih: false,
  metaTitle: "",
  metaDescription: "",
  detayBilgileri: "",
  attributes: [],
}

function productToForm(p: Product): FormData {
  return {
    name: p.name || "",
    supplier: p.supplier || "",
    stockCode: p.stockCode || "",
    brand: p.brand || "",
    barcode: p.barcode || "",
    desi: p.desi?.toString() || "",
    categoryId: p.categoryId || "",
    tedarikciFiyat: p.tedarikciFiyat?.toString() || "",
    productDiscount: p.productDiscount?.toString() || "",
    bolbolbulFiyat: p.bolbolbulFiyat?.toString() || "",
    sopyoFiyat: p.sopyoFiyat?.toString() || "",
    n11Fiyat: p.n11Fiyat?.toString() || "",
    trendyolFiyat: p.trendyolFiyat?.toString() || "",
    hepsiburadaFiyat: p.hepsiburadaFiyat?.toString() || "",
    pazaramaFiyat: p.pazaramaFiyat?.toString() || "",
    toplamStock: p.toplamStock?.toString() || "0",
    bolbolbulStock: p.bolbolbulStock?.toString() || "0",
    sopyoStock: p.sopyoStock?.toString() || "0",
    kdv: p.kdv?.toString() || "20",
    eticaret: p.eticaret ?? true,
    sopyo: p.sopyo ?? false,
    isFiyatTercih: p.isFiyatTercih ?? false,
    metaTitle: p.metaTitle || "",
    metaDescription: p.metaDescription || "",
    detayBilgileri: p.detayBilgileri || "",
    attributes: p.attributes?.length ? p.attributes : [],
  }
}

// --- Props ---

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSuccess: () => void
}

// --- Component ---

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormDialogProps) {
  const { toast } = useToast()
  const isEdit = !!product

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("general")

  // Master data
  const [categoryTree, setCategoryTree] = useState<CategoryTree[]>([])
  const [desiList, setDesiList] = useState<DesiFrontend[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // Form
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM })

  // Debounce ref for price calculation
  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Flattened categories for select ---
  const flatCategories = flattenTree(categoryTree)

  // --- Load master data on open ---
  useEffect(() => {
    if (!open) return
    const load = async () => {
      try {
        const [catRes, desiRes, supRes] = await Promise.all([
          categoryService.getTree(),
          desiService.getAll(),
          supplierService.getAll(),
        ])
        if (catRes.data) setCategoryTree(catRes.data)
        if (desiRes.data) setDesiList(desiRes.data)
        if (supRes.data) setSuppliers(supRes.data)
      } catch (err) {
        console.error("Master veri yüklenemedi:", err)
      }
    }
    load()
  }, [open])

  // --- Populate form when product changes ---
  useEffect(() => {
    if (product && open) {
      setForm(productToForm(product))
      setActiveTab("general")
    } else if (!product && open) {
      setForm({ ...EMPTY_FORM })
      setActiveTab("general")
    }
  }, [product, open])

  // --- Price calculation ---
  const runPriceCalculation = useCallback(
    async (tedarikciFiyat: number, categoryId: string, desiValue: number | undefined) => {
      if (!tedarikciFiyat || !categoryId) return

      // Find desi price from desiList
      let desiPrice: number | undefined
      if (desiValue !== undefined) {
        const matched = desiList.find((d) => Number(d.name) === desiValue || d.name === String(desiValue))
        if (matched) desiPrice = matched.price
      }

      const discount = form.productDiscount ? parseFloat(form.productDiscount) : undefined

      try {
        const res = await productService.calculatePrice({
          tedarikciFiyat,
          categoryId,
          supplierDiscount: discount,
          desiPrice,
        })
        if (res.data) {
          setForm((prev) => ({
            ...prev,
            bolbolbulFiyat: res.data!.bolbolbulFiyat.toString(),
            sopyoFiyat: res.data!.sopyoFiyat.toString(),
            n11Fiyat: res.data!.n11Fiyat.toString(),
            trendyolFiyat: res.data!.trendyolFiyat.toString(),
            hepsiburadaFiyat: res.data!.hepsiburadaFiyat.toString(),
            pazaramaFiyat: res.data!.pazaramaFiyat.toString(),
          }))
        }
      } catch (err) {
        console.error("Fiyat hesaplama hatası:", err)
      }
    },
    [desiList, form.productDiscount]
  )

  // Debounced price calc when relevant fields change
  useEffect(() => {
    if (!open) return
    const price = parseFloat(form.tedarikciFiyat)
    const catId = form.categoryId
    const desiVal = form.desi ? parseFloat(form.desi) : undefined

    if (!price || !catId) return

    if (calcTimerRef.current) clearTimeout(calcTimerRef.current)
    calcTimerRef.current = setTimeout(() => {
      runPriceCalculation(price, catId, desiVal)
    }, 500)

    return () => {
      if (calcTimerRef.current) clearTimeout(calcTimerRef.current)
    }
  }, [form.tedarikciFiyat, form.categoryId, form.desi, form.productDiscount, open, runPriceCalculation])

  // --- Field updater ---
  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // --- Attributes ---
  const addAttribute = () => {
    setForm((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { Name: "", Value: "" }],
    }))
  }

  const removeAttribute = (index: number) => {
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index),
    }))
  }

  const updateAttribute = (index: number, field: "Name" | "Value", value: string) => {
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) =>
        i === index ? { ...attr, [field]: value } : attr
      ),
    }))
  }

  // --- Submit ---
  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: "Hata", description: "Ürün adı zorunludur", variant: "destructive" })
      return
    }

    setLoading(true)

    try {
      const dto: CreateProductDto = {
        name: form.name,
        supplier: form.supplier || undefined,
        stockCode: form.stockCode || undefined,
        brand: form.brand || undefined,
        barcode: form.barcode || undefined,
        desi: form.desi ? parseFloat(form.desi) : undefined,
        categoryId: form.categoryId || undefined,
        tedarikciFiyat: form.tedarikciFiyat ? parseFloat(form.tedarikciFiyat) : undefined,
        productDiscount: form.productDiscount ? parseFloat(form.productDiscount) : undefined,
        bolbolbulFiyat: form.bolbolbulFiyat ? parseFloat(form.bolbolbulFiyat) : undefined,
        sopyoFiyat: form.sopyoFiyat ? parseFloat(form.sopyoFiyat) : undefined,
        n11Fiyat: form.n11Fiyat ? parseFloat(form.n11Fiyat) : undefined,
        trendyolFiyat: form.trendyolFiyat ? parseFloat(form.trendyolFiyat) : undefined,
        hepsiburadaFiyat: form.hepsiburadaFiyat ? parseFloat(form.hepsiburadaFiyat) : undefined,
        pazaramaFiyat: form.pazaramaFiyat ? parseFloat(form.pazaramaFiyat) : undefined,
        toplamStock: form.toplamStock ? parseInt(form.toplamStock) : undefined,
        bolbolbulStock: form.bolbolbulStock ? parseInt(form.bolbolbulStock) : undefined,
        sopyoStock: form.sopyoStock ? parseInt(form.sopyoStock) : undefined,
        kdv: form.kdv ? parseFloat(form.kdv) : undefined,
        eticaret: form.eticaret,
        sopyo: form.sopyo,
        isFiyatTercih: form.isFiyatTercih,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        detayBilgileri: form.detayBilgileri || undefined,
        attributes: form.attributes.filter((a) => a.Name.trim() && a.Value.trim()),
      }

      if (isEdit && product) {
        await productService.update(product.id, dto)
        toast({ title: "Başarılı", description: "Ürün güncellendi" })
      } else {
        await productService.create(dto)
        toast({ title: "Başarılı", description: "Ürün oluşturuldu" })
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "İşlem başarısız"
      toast({ title: "Hata", description: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEdit ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
          </DialogTitle>
          <DialogDescription>
            Ürün bilgilerini doldurun ve kaydedin
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">
              <Info className="h-4 w-4 mr-2" />
              Genel Bilgiler
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-2" />
              Fiyatlar & Stok
            </TabsTrigger>
            <TabsTrigger value="seo">
              <Search className="h-4 w-4 mr-2" />
              SEO & İçerik
            </TabsTrigger>
            <TabsTrigger value="attributes">
              <List className="h-4 w-4 mr-2" />
              Özellikler
            </TabsTrigger>
          </TabsList>

          {/* ========== GENEL BİLGİLER ========== */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Ürün Adı *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Ürün adını girin"
                />
              </div>

              <div>
                <Label htmlFor="stockCode">Stok Kodu</Label>
                <Input
                  id="stockCode"
                  value={form.stockCode}
                  onChange={(e) => setField("stockCode", e.target.value)}
                  placeholder="Stok kodu"
                />
              </div>

              <div>
                <Label htmlFor="barcode">Barkod</Label>
                <Input
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) => setField("barcode", e.target.value)}
                  placeholder="Barkod numarası"
                />
              </div>

              <div>
                <Label htmlFor="brand">Marka</Label>
                <Input
                  id="brand"
                  value={form.brand}
                  onChange={(e) => setField("brand", e.target.value)}
                  placeholder="Marka adı"
                />
              </div>

              <div>
                <Label htmlFor="supplier">Tedarikçi</Label>
                <Select
                  value={form.supplier || "none"}
                  onValueChange={(v) => setField("supplier", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tedarikçi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tedarikçi yok</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="categoryId">Kategori</Label>
                <Select
                  value={form.categoryId || "none"}
                  onValueChange={(v) => setField("categoryId", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kategori Yok</SelectItem>
                    {flatCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {"—".repeat(cat.depth)} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="desi">Desi</Label>
                <Select
                  value={form.desi || "none"}
                  onValueChange={(v) => setField("desi", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Desi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Desi Yok</SelectItem>
                    {desiList.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name} ({d.price} TL)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="kdv">KDV (%)</Label>
                <Select
                  value={form.kdv}
                  onValueChange={(v) => setField("kdv", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="KDV oranı" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">%0</SelectItem>
                    <SelectItem value="1">%1</SelectItem>
                    <SelectItem value="10">%10</SelectItem>
                    <SelectItem value="20">%20</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-6 col-span-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="eticaret"
                    checked={form.eticaret}
                    onCheckedChange={(v) => setField("eticaret", v)}
                  />
                  <Label htmlFor="eticaret">E-Ticaret</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="sopyo"
                    checked={form.sopyo}
                    onCheckedChange={(v) => setField("sopyo", v)}
                  />
                  <Label htmlFor="sopyo">Sopyo</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isFiyatTercih"
                    checked={form.isFiyatTercih}
                    onCheckedChange={(v) => setField("isFiyatTercih", v)}
                  />
                  <Label htmlFor="isFiyatTercih">Fiyat Tercihi</Label>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ========== FİYATLAR & STOK ========== */}
          <TabsContent value="pricing" className="space-y-6 mt-4">
            <div>
              <h3 className="font-semibold text-lg mb-3">Tedarikçi Fiyat</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tedarikciFiyat">Tedarikçi Fiyatı (TL) *</Label>
                  <Input
                    id="tedarikciFiyat"
                    type="number"
                    step="0.01"
                    value={form.tedarikciFiyat}
                    onChange={(e) => setField("tedarikciFiyat", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="productDiscount">Ürün İndirimi (%)</Label>
                  <Input
                    id="productDiscount"
                    type="number"
                    step="0.01"
                    value={form.productDiscount}
                    onChange={(e) => setField("productDiscount", e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-1">Pazaryeri Fiyatları</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Tedarikçi fiyatı, kategori ve desi değiştiğinde otomatik hesaplanır.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bolbolbulFiyat">BolBolBul Fiyatı (TL)</Label>
                  <Input
                    id="bolbolbulFiyat"
                    type="number"
                    step="0.01"
                    value={form.bolbolbulFiyat}
                    onChange={(e) => setField("bolbolbulFiyat", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="sopyoFiyat">Sopyo Fiyatı (TL)</Label>
                  <Input
                    id="sopyoFiyat"
                    type="number"
                    step="0.01"
                    value={form.sopyoFiyat}
                    onChange={(e) => setField("sopyoFiyat", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="n11Fiyat">N11 Fiyatı (TL)</Label>
                  <Input
                    id="n11Fiyat"
                    type="number"
                    step="0.01"
                    value={form.n11Fiyat}
                    onChange={(e) => setField("n11Fiyat", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="trendyolFiyat">Trendyol Fiyatı (TL)</Label>
                  <Input
                    id="trendyolFiyat"
                    type="number"
                    step="0.01"
                    value={form.trendyolFiyat}
                    onChange={(e) => setField("trendyolFiyat", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="hepsiburadaFiyat">Hepsiburada Fiyatı (TL)</Label>
                  <Input
                    id="hepsiburadaFiyat"
                    type="number"
                    step="0.01"
                    value={form.hepsiburadaFiyat}
                    onChange={(e) => setField("hepsiburadaFiyat", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="pazaramaFiyat">Pazarama Fiyatı (TL)</Label>
                  <Input
                    id="pazaramaFiyat"
                    type="number"
                    step="0.01"
                    value={form.pazaramaFiyat}
                    onChange={(e) => setField("pazaramaFiyat", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Stok</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="toplamStock">Toplam Stok</Label>
                  <Input
                    id="toplamStock"
                    type="number"
                    value={form.toplamStock}
                    onChange={(e) => setField("toplamStock", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="bolbolbulStock">BolBolBul Stok</Label>
                  <Input
                    id="bolbolbulStock"
                    type="number"
                    value={form.bolbolbulStock}
                    onChange={(e) => setField("bolbolbulStock", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="sopyoStock">Sopyo Stok</Label>
                  <Input
                    id="sopyoStock"
                    type="number"
                    value={form.sopyoStock}
                    onChange={(e) => setField("sopyoStock", e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ========== SEO & İÇERİK ========== */}
          <TabsContent value="seo" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="metaTitle">Meta Başlık</Label>
              <Input
                id="metaTitle"
                value={form.metaTitle}
                onChange={(e) => setField("metaTitle", e.target.value)}
                placeholder="SEO başlığı"
              />
            </div>

            <div>
              <Label htmlFor="metaDescription">Meta Açıklama</Label>
              <Textarea
                id="metaDescription"
                value={form.metaDescription}
                onChange={(e) => setField("metaDescription", e.target.value)}
                placeholder="SEO açıklaması"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="detayBilgileri">Detay Bilgileri (HTML)</Label>
              <Textarea
                id="detayBilgileri"
                value={form.detayBilgileri}
                onChange={(e) => setField("detayBilgileri", e.target.value)}
                placeholder="Ürün detay bilgileri..."
                rows={6}
              />
            </div>
          </TabsContent>

          {/* ========== ÖZELLİKLER ========== */}
          <TabsContent value="attributes" className="space-y-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label>Ürün Özellikleri</Label>
                <p className="text-sm text-muted-foreground">
                  Ürün için ek özellikler tanımlayabilirsiniz
                </p>
              </div>
              <Button onClick={addAttribute} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Özellik Ekle
              </Button>
            </div>

            {form.attributes.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                Henüz özellik eklenmedi
              </div>
            ) : (
              <div className="space-y-3">
                {form.attributes.map((attr, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-5">
                      <Label>Özellik Adı</Label>
                      <Input
                        value={attr.Name}
                        onChange={(e) => updateAttribute(index, "Name", e.target.value)}
                        placeholder="örneğin: Renk"
                      />
                    </div>
                    <div className="col-span-6">
                      <Label>Değer</Label>
                      <Input
                        value={attr.Value}
                        onChange={(e) => updateAttribute(index, "Value", e.target.value)}
                        placeholder="örneğin: Kırmızı"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAttribute(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Güncelle" : "Kaydet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
