# Exvado Spider — E-Ticaret Yönetim Paneli

## Proje Hakkında

Türkçe e-ticaret admin paneli. Ürün, tedarikçi, sipariş, envanter ve analitik yönetimi. Birden fazla pazaryeri entegrasyonu (Trendyol, Hepsiburada, N11, BolBolBul).

## Teknoloji

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui + Radix UI |
| Backend API | Next.js API Routes (migrasyon devam ediyor) |
| Worker | Ayrı Node.js process (tedarikçi botları + cron) |
| ORM | Prisma (MySQL) |
| Auth | JWT (Bearer token) |
| Formlar | react-hook-form + Zod |
| Grafikler | Recharts |

## Geliştirme Komutları

```bash
npm run dev        # Frontend + API geliştirme sunucusu
npm run build      # Production build
npm run lint       # ESLint
npm run worker:dev # Worker process (tedarikçi sync + cron) — henüz kurulmadı
```

---

## Migrasyon Durumu (AdonisJS → Next.js)

Mevcut AdonisJS backend (`bolbolbulpanel-main`) projesinden Next.js API Routes + Worker mimarisine geçiş yapılıyor.

### Genel İlerleme

| Faz | Durum | Açıklama |
|-----|-------|----------|
| Faz 0: Altyapı Kurulumu | ✅ Tamamlandı | Prisma, JWT, response helpers, middleware, transformers |
| Faz 1: Authentication | ✅ Tamamlandı | Login, me, route koruması (middleware) |
| Faz 2: Temel CRUD | ✅ Tamamlandı | Categories, Brands, Suppliers, Desi, Özellikler — API + service + frontend |
| Faz 3: Ürün Yönetimi | ⬜ Bekliyor | Products CRUD API route yok, service dosyası var ama çalışmıyor |
| Faz 4: Upload & Media | ⬜ Bekliyor | upload.service.ts var ama /api/upload route yok |
| Faz 5: E-Ticaret Özellikleri | ⬜ Bekliyor | Service dosyaları var (currency, slider, page, menu, settings) ama API route'ları yok |
| Faz 6: Fiyatlandırma Motoru | 🔄 Devam Ediyor | price-tiers API + pricing.ts utility hazır, ürün fiyat hesaplama entegrasyonu bekliyor |
| Faz 7: AI & GTIN | 🔄 Devam Ediyor | AI generate API tamamlandı + prompt optimize edildi, GTIN/GTIP bekliyor |
| Faz 8: Worker (Tedarikçi Botları) | ⬜ Bekliyor | worker/ dizini henüz yok |
| Faz 9: Pazaryeri Entegrasyonları | ⬜ Bekliyor | Trendyol, N11, Ticimax sipariş sync |
| Faz 10: Dashboard & Raporlar | ⬜ Bekliyor | Frontend sayfaları var ama backend API'ye bağlı değil |
| Faz 11: Veri Migrasyonu | ⬜ Bekliyor | scripts/ dizini henüz yok |

**Durum İkonları:** ⬜ Bekliyor · 🔄 Devam Ediyor · ✅ Tamamlandı

---

### Faz 0 Detay: Altyapı

| Görev | Durum |
|-------|-------|
| Prisma + bcryptjs + jsonwebtoken kurulumu | ✅ |
| `prisma/schema.prisma` — User modeli (DB'ye uyumlu) | ✅ |
| `lib/db/prisma.ts` — Prisma client singleton | ✅ |
| `lib/middleware/auth.ts` — JWT doğrulama | ✅ |
| `lib/utils/response.ts` — success/paginated/error helper'ları | ✅ |
| `.env` dosyası güncelle (DATABASE_URL, JWT_SECRET) | ✅ |
| `middleware.ts` — Next.js route koruması | ✅ |
| `next.config.ts` Prisma uyumluluğu | ✅ |

### Faz 1 Detay: Auth

| Endpoint | Durum |
|----------|-------|
| POST `/api/auth/login` | ✅ |
| GET `/api/auth/me` | ✅ |
| `middleware.ts` route koruması (token yoksa → /login) | ✅ |
| Login sayfası API entegrasyonu | ✅ |
| `<Toaster />` root layout'a eklendi | ✅ |

### Faz 2 Detay: Temel CRUD

| Kaynak | API Route | Service | Frontend | Durum |
|--------|-----------|---------|----------|-------|
| Categories | ✅ CRUD + tree + reorder + commissions | ✅ categoryService | ✅ /categories | ✅ |
| Brands | ✅ CRUD + reorder | ✅ brandService | ✅ /brands | ✅ |
| Suppliers | ✅ CRUD | ✅ supplierService | ✅ /supplier-rates | ✅ |
| Supplier Logs | ✅ GET (paginated) | ✅ supplierLogService | ✅ /supplier-logs | ✅ |
| Desi | ✅ CRUD | ✅ desiService | ✅ /desi | ✅ |
| Özellikler | ✅ CRUD + groups | ✅ specificationService | ✅ /specifications | ✅ |
| Price Tiers | ✅ CRUD | ✅ priceTierService | ✅ /categories (komisyon) | ✅ |

### Faz 3 Detay: Ürün Yönetimi

| Kaynak | API Route | Service | Frontend | Durum |
|--------|-----------|---------|----------|-------|
| Products CRUD | ❌ /api/products yok | ⚠️ product.service.ts var (çalışmıyor) | /products sayfası var | ⬜ |
| Ürün Düzenleme | ❌ | ⚠️ | /products/edit/[id] var (sadece AI bağlı) | ⬜ |
| Tedarikçi Ürünleri | ❌ | ❌ | ❌ | ⬜ |
| Fiyat Hesaplama | ❌ | ⚠️ pricing.ts utility var | ❌ | ⬜ |
| Pazaryeri Fiyatları | ❌ | ❌ | ❌ | ⬜ |
| Stok Yönetimi | ❌ | ❌ | /inventory sayfası var | ⬜ |
| Toplu Fiyat Güncelleme | ❌ | ❌ | ❌ | ⬜ |

### Faz 4 Detay: Upload & Media

| Kaynak | API Route | Service | Durum |
|--------|-----------|---------|-------|
| Resim Yükleme | ❌ /api/upload yok | ⚠️ upload.service.ts var (çalışmıyor) | ⬜ |
| Resim Optimizasyon | ❌ | ❌ | ⬜ |
| Thumbnail | ❌ | ❌ | ⬜ |

### Faz 5 Detay: E-Ticaret Özellikleri

| Kaynak | API Route | Service | Durum |
|--------|-----------|---------|-------|
| Currencies | ❌ /api/currencies yok | ⚠️ currency.service.ts var (çalışmıyor) | ⬜ |
| Sliders | ❌ /api/sliders yok | ⚠️ slider.service.ts var (çalışmıyor) | ⬜ |
| Slider Settings | ❌ /api/slider-settings yok | ⚠️ slider-settings.service.ts var (çalışmıyor) | ⬜ |
| Pages | ❌ /api/pages yok | ⚠️ page.service.ts var (çalışmıyor) | ⬜ |
| Menus | ❌ /api/menu yok | ⚠️ menu.service.ts var (çalışmıyor) | ⬜ |
| Settings | ❌ /api/settings yok | ⚠️ settings.service.ts var (çalışmıyor) | ⬜ |
| Dealer Classes | ❌ /api/dealer-classes yok | ⚠️ dealerClass.service.ts var (çalışmıyor) | ⬜ |
| Integrations | ❌ /api/integrations yok | ⚠️ integrations.ts var (çalışmıyor) | ⬜ |

### Faz 8 Detay: Worker Tedarikçi Pluginleri

| Plugin | Kaynak Tipi | Durum |
|--------|------------|-------|
| Civaner | Web scraping (axios + jsdom) | ⬜ |
| Ital | B2B API | ⬜ |
| Mapas | B2B API + retry | ⬜ |
| ABM Hirdavat | XML | ⬜ |
| Akin Ziraat | — | ⬜ |
| Bizim Hesap | — | ⬜ |
| Catpower | — | ⬜ |
| Cullas | — | ⬜ |
| Pars | — | ⬜ |
| Döviz Sheet | Google Sheets | ⬜ |
| Gediz Stok Sheet | Google Sheets | ⬜ |
| Google Sheets | Google Sheets | ⬜ |

### Eksik API Route'ları (Service var, Route yok)

⚠️ Bu service dosyaları `/api/...` endpoint'lerine istek atıyor ama karşılık gelen API route mevcut değil. `NEXT_PUBLIC_API_URL` boşsa (şu an boş) bu sayfalar çalışmaz.

| Service Dosyası | Beklenen Route | Kritiklik |
|-----------------|---------------|-----------|
| product.service.ts | /api/products | 🔴 Kritik |
| upload.service.ts | /api/upload | 🔴 Kritik |
| currency.service.ts | /api/currencies | 🟡 Orta |
| dealerClass.service.ts | /api/dealer-classes | 🟡 Orta |
| slider.service.ts | /api/sliders | 🟢 Düşük |
| slider-settings.service.ts | /api/slider-settings | 🟢 Düşük |
| page.service.ts | /api/pages | 🟢 Düşük |
| menu.service.ts | /api/menu | 🟢 Düşük |
| settings.service.ts | /api/settings | 🟢 Düşük |

### Prisma Schema Durumu

Tanımlı modeller (10): User, Category, Brand, Supplier, Desi, SpecificationGroup, Specification, PriceTier, CategoryCommission, SupplierCron

| Eksik Model | Faz | Açıklama |
|-------------|-----|----------|
| Product | Faz 3 | Ürün tablosu — en kritik eksik |
| ProductImage | Faz 4 | Ürün görselleri |
| Currency | Faz 5 | Döviz kurları |
| Slider | Faz 5 | Ana sayfa slider |
| Page | Faz 5 | Statik sayfalar |
| Menu | Faz 5 | Navigasyon menüsü |
| Order | Faz 9 | Siparişler |
| Integration | Faz 9 | Pazaryeri entegrasyonları |

### Frontend Sayfa Durumu

27 sayfa mevcut. Sadece 7 tanesi yeni API route'larına bağlı:

| Sayfa | Backend Bağlantısı |
|-------|-------------------|
| /brands | ✅ brandService → /api/brands |
| /categories | ✅ categoryService → /api/categories |
| /desi | ✅ desiService → /api/desi |
| /specifications | ✅ specificationService → /api/specifications |
| /supplier-rates | ✅ supplierService → /api/suppliers |
| /supplier-logs | ✅ supplierLogService → /api/supplier-logs |
| /products/edit/[id] | ⚠️ Sadece aiService bağlı, ürün CRUD yok |
| /products, /inventory, /orders, /sales-reports, vb. | ❌ Backend API route yok |

---

## Mimari

```
Exvado-Spider/
├── app/
│   ├── api/                  # Next.js API Routes (backend)
│   │   ├── auth/             # Login, me
│   │   ├── categories/       # CRUD + tree + reorder + commissions
│   │   ├── brands/           # CRUD + reorder
│   │   ├── suppliers/        # CRUD
│   │   ├── desi/             # CRUD
│   │   ├── specifications/   # CRUD + groups
│   │   ├── supplier-logs/    # Liste
│   │   ├── price-tiers/      # CRUD
│   │   ├── ai/generate/      # OpenAI meta & açıklama üretimi
│   │   └── ...
│   └── (sayfalar)/           # Frontend sayfaları
├── prisma/
│   └── schema.prisma
├── lib/
│   ├── db/prisma.ts          # Prisma client
│   ├── middleware/auth.ts     # JWT middleware
│   ├── utils/response.ts     # Response helper'ları
│   └── api/                  # Frontend API client
├── worker/                   # (planlandı) Ayrı Node.js process
└── scripts/                  # (planlandı) Migrasyon scriptleri
```

### API ↔ Worker İlişkisi
- Aynı Prisma client ve service layer'ı paylaşırlar
- Worker sync durumunu DB'ye yazar, API route'ları oradan okur
- HTTP iletişimi yok — sadece paylaşılan kod ve veritabanı

### Fiyatlandırma Akışı
```
Tedarikçi Fiyatı
  → İskonto uygula (tedarikçi bazlı)
  → Döviz çevrimi (USD/EUR → TRY)
  → Kademe oranı seç (17 fiyat aralığı)
  → Kademe markup ekle
  → Desi (kargo) maliyeti ekle
  → Pazaryeri markup'ları (Sopyo, N11, Trendyol, Hepsiburada, Pazarama)
```

---

## Değişiklik Geçmişi

| Tarih | Değişiklik |
|-------|-----------|
| 2026-03-29 | Kapsamlı proje analizi: 9 eksik API route tespit edildi, Prisma schema eksikleri belgelendi, 27 frontend sayfasının backend bağlantı durumu haritalandı. |
| 2026-03-08 | AI prompt optimizasyonu: System prompt meta/description olarak ikiye ayrıldı. Kategori, marka, ürün meta ve ürün açıklaması promptları SEO kuralları ve CTA talimatları ile güncellendi. |
| 2026-03-03 | Migrasyon planı oluşturuldu. Faz 0 + Faz 1 (Auth) tamamlandı: Login API, Me API, route koruması, Toaster. |
