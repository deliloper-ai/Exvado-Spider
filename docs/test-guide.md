# Exvado Spider — Test Rehberi

Son güncelleme: 2026-03-29

---

## Ön Hazırlık

### 1. Sunucuyu Başlat
```bash
npm run dev
```
Varsayılan: `http://localhost:3000` (3000 meşgulse 3001)

### 2. Ortam Değişkenleri (.env)
```
DATABASE_URL=mysql://root:...@185.95.165.72:3306/integration_new2  ✅
JWT_SECRET=89c20a3e...                                              ✅
OPENAI_API_KEY=sk-proj-...                                          ✅
NEXT_PUBLIC_API_URL=""                                               ✅ (boş = relative URL)
```

### 3. Test Token Al
```bash
# Login ol ve token al
curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "SENIN_EMAIL", "password": "SENIN_SIFRE"}' | jq .

# Token'ı kaydet (sonraki isteklerde kullanacaksın)
TOKEN="buraya_token_yapistir"
```

### 4. Token Doğrula
```bash
curl -s http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```
**Beklenen:** `{ success: true, data: { id, email, full_name } }`

---

## A. Authentication Testleri

| # | Test | Komut | Beklenen |
|---|------|-------|----------|
| A1 | Doğru bilgilerle login | `curl -X POST /api/auth/login -d '{"email":"..","password":".."}'` | `{ success: true, token: "...", user: {...} }` |
| A2 | Yanlış şifre | `curl -X POST /api/auth/login -d '{"email":"..","password":"yanlis"}'` | `{ success: false, error: "..." }` |
| A3 | Token olmadan istek | `curl /api/brands` | `{ success: false }` (401) |
| A4 | Geçersiz token | `curl /api/brands -H "Authorization: Bearer sahtetoken"` | 401 |
| A5 | /me endpoint | `curl /api/auth/me -H "Authorization: Bearer $TOKEN"` | Kullanıcı bilgileri |

---

## B. Markalar (Brands) Testleri

```bash
# B1 — Tüm markaları listele
curl -s http://localhost:3000/api/brands \
  -H "Authorization: Bearer $TOKEN" | jq .

# B2 — Yeni marka oluştur
curl -s -X POST http://localhost:3000/api/brands \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Marka", "isActive": true}' | jq .

# B3 — Marka güncelle (ID'yi B2'den al)
curl -s -X PUT http://localhost:3000/api/brands/MARKA_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Marka Güncellendi"}' | jq .

# B4 — Marka sil
curl -s -X DELETE http://localhost:3000/api/brands/MARKA_ID \
  -H "Authorization: Bearer $TOKEN" | jq .

# B5 — Sıralama güncelle
curl -s -X POST http://localhost:3000/api/brands/reorder \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"brands": [{"id": "1", "order": 1}, {"id": "2", "order": 2}]}' | jq .
```

| # | Test | Beklenen |
|---|------|----------|
| B1 | Marka listesi | `{ success: true, data: [...] }` |
| B2 | Marka oluştur | `201` + oluşturulan marka |
| B3 | Marka güncelle | Güncellenmiş marka |
| B4 | Marka sil | `{ success: true }` |
| B5 | Sıralama | `{ success: true }` |

---

## C. Kategoriler (Categories) Testleri

```bash
# C1 — Tüm kategorileri listele
curl -s http://localhost:3000/api/categories \
  -H "Authorization: Bearer $TOKEN" | jq .

# C2 — Kategori ağacı
curl -s http://localhost:3000/api/categories/tree \
  -H "Authorization: Bearer $TOKEN" | jq .

# C3 — Yeni kategori oluştur
curl -s -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Kategori", "parentId": "0", "isActive": true}' | jq .

# C4 — Komisyon oranlarını getir
curl -s http://localhost:3000/api/categories/KATEGORI_ID/commissions \
  -H "Authorization: Bearer $TOKEN" | jq .

# C5 — Komisyon oranlarını güncelle
curl -s -X PUT http://localhost:3000/api/categories/KATEGORI_ID/commissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"marketplaceRates": {"sopyo_oran": 10, "n11_oran": 15, "trendyol_oran": 12, "hepsiburada_oran": 14, "pazarama_oran": 11}, "tierCommissions": [{"tierId": 1, "rate": 25}]}' | jq .

# C6 — Alt kategorisi olan kategoriyi silmeyi dene (hata vermeli)
curl -s -X DELETE http://localhost:3000/api/categories/UST_KATEGORI_ID \
  -H "Authorization: Bearer $TOKEN" | jq .
```

| # | Test | Beklenen |
|---|------|----------|
| C1 | Kategori listesi | `{ success: true, data: [...] }` |
| C2 | Ağaç yapısı | Hiyerarşik veri (children iç içe) |
| C3 | Kategori oluştur | `201` |
| C4 | Komisyon getir | Kademe oranları + marketplace oranları |
| C5 | Komisyon güncelle | Güncellenen oranlar |
| C6 | Alt kategorili silme | Hata (400 veya 409) |

---

## D. Ürünler (Products) Testleri

```bash
# D1 — Ürün listesi (sayfalama + filtre)
curl -s "http://localhost:3000/api/products?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq .

# D2 — Ürün listesi (tedarikçi filtresi)
curl -s "http://localhost:3000/api/products?supplier=Ital&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq .

# D3 — Ürün listesi (arama)
curl -s "http://localhost:3000/api/products?search=pompa&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq .

# D4 — Ürün listesi (fiyat aralığı)
curl -s "http://localhost:3000/api/products?minPrice=100&maxPrice=500" \
  -H "Authorization: Bearer $TOKEN" | jq .

# D5 — Ürün listesi (stok durumu)
curl -s "http://localhost:3000/api/products?stockStatus=out_of_stock" \
  -H "Authorization: Bearer $TOKEN" | jq .

# D6 — Tekil ürün getir
curl -s http://localhost:3000/api/products/URUN_ID \
  -H "Authorization: Bearer $TOKEN" | jq .

# D7 — Ürün güncelle
curl -s -X PUT http://localhost:3000/api/products/URUN_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"metaTitle": "Test Meta Başlık", "toplamStock": 50}' | jq .

# D8 — ⚡ Fiyat hesaplama (KRİTİK TEST)
curl -s -X POST http://localhost:3000/api/products/calculate-price \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tedarikciFiyat": 100, "categoryId": "KATEGORI_ID", "supplierDiscount": 10, "desiPrice": 5}' | jq .

# D9 — ⚡ Toplu fiyat güncelleme (DİKKATLİ KULLAN)
curl -s -X POST http://localhost:3000/api/products/recalculate-all \
  -H "Authorization: Bearer $TOKEN" | jq .
```

| # | Test | Beklenen |
|---|------|----------|
| D1 | Sayfalama | `{ success: true, data: [...], pagination: { page, limit, total, totalPages } }` |
| D2 | Tedarikçi filtre | Sadece o tedarikçinin ürünleri |
| D3 | Arama | Eşleşen ürünler |
| D4 | Fiyat aralığı | Min-max arası ürünler |
| D5 | Stok filtre | Stokta olmayan ürünler |
| D6 | Tekil ürün | Tüm alanlar dolu (fiyatlar, stoklar, attributes, images) |
| D7 | Güncelleme | Güncellenen alanlar |
| D8 | **Fiyat hesaplama** | `baseFiyat`, `bolbolbulFiyat`, `sopyoFiyat`, `n11Fiyat`, `trendyolFiyat`, `hepsiburadaFiyat`, `pazaramaFiyat` |
| D9 | Toplu güncelleme | `{ updated: X, skipped: Y, total: Z }` |

### D8 Fiyat Hesaplama Doğrulama (Kritik!)
```
Girdi: tedarikciFiyat=100, categoryId=X, supplierDiscount=10, desiPrice=5
Beklenen akış:
  1. Kademe seçimi → 100 TL ile (İNDİRİM ÖNCESİ!) → Kademe 2 (40-110)
  2. baseFiyat = 100 - (100 × 10 / 100) = 90
  3. bolbolbulFiyat = 90 + (90 × kategori_oran / 100) + 5
  4. sopyoFiyat = (90 + 90×oran/100) + ((90+90×oran/100) × sopyo_oran/100) + 5
  5. n11 = sopyoFiyat + (sopyoFiyat × n11_oran / 100)
  6. trendyol = sopyoFiyat + (sopyoFiyat × trendyol_oran / 100)
  ...
```

---

## E. Tedarikçi Ürünleri (Supplier Products) Testleri

```bash
# E1 — Envantere eklenmemiş ürünler
curl -s "http://localhost:3000/api/supplier-products?envanterStatus=0&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq .

# E2 — Envantere eklenmiş ürünler
curl -s "http://localhost:3000/api/supplier-products?envanterStatus=1&page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq .

# E3 — Tedarikçiye göre filtrele
curl -s "http://localhost:3000/api/supplier-products?supplier=Ital&envanterStatus=0" \
  -H "Authorization: Bearer $TOKEN" | jq .

# E4 — ⚡ Envantere ekle (fiyat otomatik hesaplanır)
curl -s -X POST http://localhost:3000/api/supplier-products/TEDARIKCI_URUN_ID/add-to-inventory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"categoryId": "KATEGORI_ID", "desi": 10, "kdv": 20}' | jq .

# E5 — Aynı ürünü tekrar eklemeyi dene (hata vermeli)
curl -s -X POST http://localhost:3000/api/supplier-products/AYNI_ID/add-to-inventory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"categoryId": "KATEGORI_ID"}' | jq .
```

| # | Test | Beklenen |
|---|------|----------|
| E1 | Eklenmemiş liste | `envanter_status: 0` olan ürünler |
| E2 | Eklenmiş liste | `envanter_status: 1` olan ürünler |
| E3 | Tedarikçi filtre | Sadece o tedarikçi |
| E4 | **Envantere ekle** | `201` + ürün oluşturulur, fiyatlar hesaplanır, `envanter_status=1` güncellenir |
| E5 | Tekrar ekleme | `409` hata (zaten eklenmiş) |

---

## F. Tedarikçiler (Suppliers) Testleri

```bash
# F1 — Tedarikçi listesi
curl -s http://localhost:3000/api/suppliers \
  -H "Authorization: Bearer $TOKEN" | jq .

# F2 — Tedarikçi oluştur
curl -s -X POST http://localhost:3000/api/suppliers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Tedarikçi", "isActive": true}' | jq .

# F3 — Tedarikçi güncelle
curl -s -X PUT http://localhost:3000/api/suppliers/TEDARIKCI_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Tedarikçi Güncellendi"}' | jq .
```

---

## G. Tedarikçi Logları Testleri

```bash
# G1 — Log listesi
curl -s "http://localhost:3000/api/supplier-logs?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq .

# G2 — Durum filtresi
curl -s "http://localhost:3000/api/supplier-logs?status=success" \
  -H "Authorization: Bearer $TOKEN" | jq .

# G3 — Tedarikçi filtresi
curl -s "http://localhost:3000/api/supplier-logs?supplier=Ital" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## H. Desi Testleri

```bash
# H1 — Desi listesi
curl -s http://localhost:3000/api/desi \
  -H "Authorization: Bearer $TOKEN" | jq .

# H2 — Desi oluştur
curl -s -X POST http://localhost:3000/api/desi \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "99", "price": 999}' | jq .

# H3 — Desi güncelle
curl -s -X PUT http://localhost:3000/api/desi/DESI_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price": 1500}' | jq .

# H4 — Desi sil
curl -s -X DELETE http://localhost:3000/api/desi/DESI_ID \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## I. Özellikler (Specifications) Testleri

```bash
# I1 — Özellik listesi (gruplu)
curl -s http://localhost:3000/api/specifications \
  -H "Authorization: Bearer $TOKEN" | jq .

# I2 — Özellik grubu oluştur
curl -s -X POST http://localhost:3000/api/specifications/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Grup"}' | jq .

# I3 — Özellik oluştur (gruba bağlı)
curl -s -X POST http://localhost:3000/api/specifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Özellik", "groupId": "GRUP_ID"}' | jq .

# I4 — Özelliği olan grubu silmeyi dene (hata vermeli)
curl -s -X DELETE http://localhost:3000/api/specifications/groups/GRUP_ID \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## J. Fiyat Kademeleri (Price Tiers) Testleri

```bash
# J1 — Kademe listesi
curl -s http://localhost:3000/api/price-tiers \
  -H "Authorization: Bearer $TOKEN" | jq .

# J2 — Kademe oluştur
curl -s -X POST http://localhost:3000/api/price-tiers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"minFiyat": 100001, "maxFiyat": 200000, "sira": 18}' | jq .

# J3 — Kademe sil (cascade: komisyonlar da silinir)
curl -s -X DELETE http://localhost:3000/api/price-tiers/KADEME_ID \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## K. AI İçerik Üretimi Testleri

```bash
# K1 — Kategori meta üret
curl -s -X POST http://localhost:3000/api/ai/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "category-meta", "params": {"categoryName": "Bahçe Makineleri"}}' | jq .

# K2 — Marka meta üret
curl -s -X POST http://localhost:3000/api/ai/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "brand-meta", "params": {"brandName": "Nortek"}}' | jq .

# K3 — Ürün meta üret
curl -s -X POST http://localhost:3000/api/ai/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "product-meta", "params": {"productName": "Su Pompası 2HP", "categoryName": "Su Motoru"}}' | jq .

# K4 — Ürün açıklaması üret
curl -s -X POST http://localhost:3000/api/ai/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "product-description", "params": {"productName": "Su Pompası 2HP", "minWords": 150, "maxWords": 200, "attributes": [{"name": "Güç", "value": "2 HP"}, {"name": "Voltaj", "value": "380V"}]}}' | jq .
```

| # | Test | Beklenen |
|---|------|----------|
| K1 | Kategori meta | `{ title: "Bahçe Makineleri ... \| bolbolbul.com", desc: "... CTA ..." }` |
| K2 | Marka meta | `{ title: "Nortek ... \| bolbolbul.com", desc: "... güvenilir ... CTA" }` |
| K3 | Ürün meta | `{ title: "Su Pompası ... bolbolbul.com", desc: "... CTA" }` |
| K4 | Ürün açıklaması | `<p>` + `<br/>` formatında, 150-200 kelime, fayda odaklı |

---

## L. Upload Testleri

```bash
# L1 — Tekli resim yükle
curl -s -X POST http://localhost:3000/api/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/test-image.jpg" | jq .

# L2 — Çoklu resim yükle
curl -s -X POST http://localhost:3000/api/upload/images \
  -H "Authorization: Bearer $TOKEN" \
  -F "images=@/path/to/img1.jpg" \
  -F "images=@/path/to/img2.jpg" | jq .

# L3 — 5MB üzeri dosya (hata vermeli)
curl -s -X POST http://localhost:3000/api/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/large-file.jpg" | jq .

# L4 — Resim olmayan dosya (hata vermeli)
curl -s -X POST http://localhost:3000/api/upload/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/file.pdf" | jq .
```

| # | Test | Beklenen |
|---|------|----------|
| L1 | Tekli yükleme | `{ filename, originalName, mimetype, size, path, url }` |
| L2 | Çoklu yükleme | Dosya dizisi |
| L3 | 5MB aşımı | Hata mesajı |
| L4 | Yanlış format | Hata mesajı |

---

## M. Frontend Sayfa Testleri (Tarayıcıda)

### M1 — Login Sayfası
- [ ] `http://localhost:3000/login` açılıyor
- [ ] Doğru bilgilerle giriş yapılıyor
- [ ] Yanlış bilgilerle hata mesajı gösteriliyor
- [ ] Giriş sonrası dashboard'a yönlendiriliyor
- [ ] Token localStorage'a kaydediliyor

### M2 — Markalar Sayfası (`/brands`)
- [ ] Marka listesi yükleniyor
- [ ] Yeni marka eklenebiliyor
- [ ] Marka düzenlenebiliyor
- [ ] Marka silinebiliyor
- [ ] AI ile meta üretimi çalışıyor
- [ ] Sıralama (drag & drop) çalışıyor

### M3 — Kategoriler Sayfası (`/categories`)
- [ ] Kategori ağacı yükleniyor
- [ ] Alt kategori eklenebiliyor
- [ ] Komisyon oranları düzenlenebiliyor
- [ ] Toplu komisyon uygulanabiliyor
- [ ] AI ile meta üretimi çalışıyor

### M4 — Ürünler Sayfası (`/products`)
- [ ] Ürün listesi yükleniyor (loading spinner görülüyor)
- [ ] Sayfalama çalışıyor (önceki/sonraki)
- [ ] Arama çalışıyor (ürün adı, barkod, stok kodu)
- [ ] Tedarikçi filtresi çalışıyor
- [ ] Stok durumu filtresi çalışıyor
- [ ] Fiyat sıralaması çalışıyor (artan/azalan)
- [ ] Envanter aç/kapat toggle çalışıyor
- [ ] Ürün pasife çekme çalışıyor (modal + onay)
- [ ] Ürün satırındaki edit linki /products/edit/ID'ye gidiyor
- [ ] Boş sonuç mesajı gösteriliyor

### M5 — Ürün Düzenleme Sayfası (`/products/edit/[id]`)
- [ ] Ürün verileri API'den yükleniyor
- [ ] Kaydet butonu çalışıyor (toast bildirimi)
- [ ] AI meta üretimi çalışıyor
- [ ] AI açıklama üretimi çalışıyor
- [ ] Teknik özellik ekleme/silme çalışıyor
- [ ] Görsel yönetimi çalışıyor

### M6 — Envanter Sayfası (`/inventory`)
- [ ] **Envanter tab'ı:**
  - [ ] Ürün listesi yükleniyor
  - [ ] Stok kolonları görünüyor (toplam, BBB, Sopyo)
  - [ ] Fiyat kolonları görünüyor (alış, BBB, Sopyo)
  - [ ] Tedarikçi filtresi çalışıyor
  - [ ] Stok durumu filtresi çalışıyor
  - [ ] Sayfalama çalışıyor
  - [ ] İstatistik kartları doğru hesaplanıyor
  - [ ] Kritik stok / Stok bitti kartları filtreleme yapıyor
- [ ] **Tedarikçi Ürünleri tab'ı:**
  - [ ] Envantere eklenmemiş ürünler listeleniyor
  - [ ] Tedarikçi filtresi çalışıyor
  - [ ] "Ekle" butonu modal açıyor
  - [ ] Modal'da kategori seçimi zorunlu
  - [ ] Modal'da desi, kdv, marka, barkod alanları var
  - [ ] "Envantere Ekle" fiyat hesaplayıp ürün oluşturuyor
  - [ ] Eklenen ürün "Envanterde" olarak görünüyor
  - [ ] Aynı ürünü tekrar eklemeye izin vermiyor

### M7 — Özellikler Sayfası (`/specifications`)
- [ ] Gruplar ve özellikler yükleniyor
- [ ] Yeni grup eklenebiliyor
- [ ] Gruba özellik eklenebiliyor
- [ ] Özellik düzenlenebiliyor/silinebiliyor

### M8 — Desi Sayfası (`/desi`)
- [ ] Desi listesi yükleniyor
- [ ] Yeni desi eklenebiliyor
- [ ] Desi fiyatı güncellenebiliyor
- [ ] Desi silinebiliyor

### M9 — Tedarikçi İskontoları (`/supplier-rates`)
- [ ] Tedarikçi listesi yükleniyor
- [ ] İskonto güncellenebiliyor

### M10 — Tedarikçi Logları (`/supplier-logs`)
- [ ] Log listesi yükleniyor
- [ ] Durum filtresi çalışıyor
- [ ] Tedarikçi filtresi çalışıyor
- [ ] Sayfalama çalışıyor

---

## N. Middleware / Koruma Testleri

| # | Test | Beklenen |
|---|------|----------|
| N1 | Token olmadan `/products` ziyaret et | `/login`'e yönlendirilir |
| N2 | Token varken `/login` ziyaret et | `/` (dashboard)'a yönlendirilir |
| N3 | Token olmadan `/api/products` çağır | `401 Unauthorized` |
| N4 | `/login` sayfası auth gerektirmez | Direkt açılır |

---

## Kritik Test Senaryoları (Öncelikli!)

### ⚡ 1. Fiyat Hesaplama Doğruluğu
Kademe seçimi İNDİRİM ÖNCESİ fiyatla yapılmalı:
- `tedarikciFiyat=45`, `discount=20%` → kademe 45 TL ile seçilmeli (Kademe 2: 40-110)
- İNDİRİMLİ fiyat = 36 TL → bu Kademe 1'e düşer, **YANLIŞ** olur
- Doğru kademe = Kademe 2 (45 TL ile)

### ⚡ 2. Envantere Ekleme Akışı
1. `/api/supplier-products?envanterStatus=0` → eklenmemiş ürün bul
2. POST `/api/supplier-products/ID/add-to-inventory` → ekle
3. Products tablosunda ürün oluşmuş mu kontrol et
4. `tedarikci_urunler.envanter_status=1` olmuş mu kontrol et
5. Fiyatlar doğru hesaplanmış mı kontrol et
6. Aynı ürünü tekrar eklemeye çalış → 409 hata

### ⚡ 3. Toplu Fiyat Güncelleme
1. Kategori komisyon oranını değiştir
2. POST `/api/products/recalculate-all` çağır
3. Tüm ürünlerin fiyatları güncellenmiş mi kontrol et

---

## Test Sonuç Takibi

| Bölüm | Toplam Test | Geçen | Kalan | Durum |
|-------|------------|-------|-------|-------|
| A. Auth | 5 | | | |
| B. Markalar | 5 | | | |
| C. Kategoriler | 6 | | | |
| D. Ürünler | 9 | | | |
| E. Tedarikçi Ürünleri | 5 | | | |
| F. Tedarikçiler | 3 | | | |
| G. Loglar | 3 | | | |
| H. Desi | 4 | | | |
| I. Özellikler | 4 | | | |
| J. Fiyat Kademeleri | 3 | | | |
| K. AI | 4 | | | |
| L. Upload | 4 | | | |
| M. Frontend | 10 sayfa | | | |
| N. Middleware | 4 | | | |
| **TOPLAM** | **~69** | | | |
