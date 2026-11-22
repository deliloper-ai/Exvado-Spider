# Ürün Modülü Analiz Bulguları

Kaynak: `/Users/tariksmac/Desktop/project/bolbolbulpanel-main` (AdonisJS eski proje)

---

## 1. Fiyat Hesaplama Formülü (Kesin — Kaynak Doğrulandı)

### Adım Sırası (ÖNEMLİ)

```
1. Kademe seçimi → tedarikci_fiyat ile (İNDİRİM ÖNCESİ!)
2. İndirim uygula → baseFiyat = tedarikci_fiyat - (tedarikci_fiyat × discount / 100)
3. BolBolBul = baseFiyat + (baseFiyat × kategori_oran / 100) + desi_fiyat
4. Sopyo (ara) = baseFiyat + (baseFiyat × kategori_oran / 100)
   Sopyo (son) = Sopyo_ara + (Sopyo_ara × sopyo_oran / 100) + desi_fiyat
5. N11 = sopyo_fiyat + (sopyo_fiyat × n11_oran / 100)
6. Trendyol = sopyo_fiyat + (sopyo_fiyat × trendyol_oran / 100)
7. Hepsiburada = sopyo_fiyat + (sopyo_fiyat × hepsiburada_oran / 100)
8. Pazarama = sopyo_fiyat + (sopyo_fiyat × pazarama_oran / 100)
```

### 17 Fiyat Kademe Aralıkları

| Kademe | Min (TL) | Max (TL) | Kolon |
|--------|----------|----------|-------|
| 1 | 0 | 40 | kategori_oran_1 |
| 2 | 40.01 | 110 | kategori_oran_2 |
| 3 | 110.01 | 175 | kategori_oran_3 |
| 4 | 175.01 | 300 | kategori_oran_4 |
| 5 | 300.01 | 500 | kategori_oran_5 |
| 6 | 500.01 | 800 | kategori_oran_6 |
| 7 | 800.01 | 1300 | kategori_oran_7 |
| 8 | 1300.01 | 1800 | kategori_oran_8 |
| 9 | 1800.01 | 3000 | kategori_oran_9 |
| 10 | 3000.01 | 5000 | kategori_oran_10 |
| 11 | 5000.01 | 9500 | kategori_oran_11 |
| 12 | 9500.01 | 12500 | kategori_oran_12 |
| 13 | 12500.01 | 18000 | kategori_oran_13 |
| 14 | 18000.01 | 27000 | kategori_oran_14 |
| 15 | 27000.01 | 50000 | kategori_oran_15 |
| 16 | 50000.01 | 100000 | kategori_oran_16 |
| 17 | 100000.01 | ∞ | kategori_oran_17 |

### Kaynak Dosyalar
- `app/services/helpers/product_helper.ts:176-215` — updateAllProductsPrice()
- `app/services/supplier/plugin_base.ts:908-951` — updateProductsInDb()

---

## 2. Products Tablosu Kolonları (Eski DB)

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | INT PK | |
| name | VARCHAR | Ürün adı |
| supplier | VARCHAR | Tedarikçi adı |
| stock_code | VARCHAR | Stok kodu / SKU |
| brand | VARCHAR | Marka adı (text, FK değil) |
| barcode | VARCHAR | Barkod |
| desi | INT | Desi değeri (desi tablosundan price aranır) |
| kategori_id | INT FK | urun_cat.id |
| tedarikci_product_id | INT FK | tedarikci_urunler.id |
| tedarikci_fiyat | DECIMAL(10,2) | Tedarikçi fiyatı |
| product_discount | DECIMAL(5,2) | Tedarikçi indirimi (%) |
| bolbolbul_fiyat | DECIMAL(10,2) | BolBolBul fiyatı |
| sopyo_fiyat | DECIMAL(10,2) | Sopyo fiyatı |
| n11_fiyat | DECIMAL(10,2) | N11 fiyatı |
| trendyol_fiyat | DECIMAL(10,2) | Trendyol fiyatı |
| hepsiburada_fiyat | DECIMAL(10,2) | Hepsiburada fiyatı |
| pazarama_fiyat | DECIMAL(10,2) | Pazarama fiyatı |
| toplam_stock | INT | Toplam stok |
| bolbolbul_stock | INT | BolBolBul stok |
| sopyo_stock | INT | Sopyo stok |
| kdv | INT | KDV oranı (10 veya 20) |
| eticaret | TINYINT | E-ticaret'e gönder flag |
| sopyo | TINYINT | Sopyo'ya gönder flag |
| send_eticaret_check | TINYINT | E-ticaret sync durumu |
| send_sopyo_check | TINYINT | Sopyo sync durumu |
| isFiyatTercih | TINYINT | BizimHesap fiyat override |
| sopyo_id | INT | Sopyo marketplace ID |
| meta_title | VARCHAR | SEO meta başlık |
| meta_desc | TEXT | SEO meta açıklama |
| detay_bilgileri | LONGTEXT | Ürün detay açıklaması (HTML) |
| attributes | JSON/TEXT | Özellikler [{Name, Value}] |
| images | JSON/TEXT | Görseller (CDN URL array) |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

## 3. tedarikci_urunler Tablosu Kolonları

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | INT PK | |
| productTitle | VARCHAR | Tedarikçi ürün adı |
| productCode | VARCHAR | Tedarikçi ürün kodu |
| productStockStatus | VARCHAR | Stok durumu ('Var', 'Yok') |
| stock | INT | Stok miktarı |
| supplier_name | VARCHAR | Tedarikçi adı |
| netPriceWithVAT | DECIMAL(10,2) | KDV dahil fiyat |
| productPictures | VARCHAR/TEXT | Görsel URL |
| envanter_status | TINYINT | 0=envantere alınmadı, 1=alındı |
| bizimhesap_fiyat | DECIMAL(10,2) | BizimHesap alternatif fiyat |
| bizimhesap_stock | INT | BizimHesap stok |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

## 4. Özel İş Kuralları

### isFiyatTercih (BizimHesap Override)
```ts
if (product.isFiyatTercih == 1) {
  baseFiyat = tedarikci_urunler.bizimhesap_fiyat  // alternatif fiyat kullan
  tedarikci_discount = 0                           // indirim sıfırla
}
```

### Döviz Çevrimi (Supplier bazlı)
```ts
let kur = item.currency === 'USD' ? ted_data?.dolar_kur : ted_data?.euro_kur
item.netPriceWithVAT = item.netPriceWithVAT * kur
```

### Toplu Fiyat Güncelleme Tetikleyicileri
- Tedarikçi iskontosu değiştiğinde → tüm ürünler yeniden hesaplanır
- Kategori kademe oranları değiştiğinde → tüm ürünler yeniden hesaplanır
- NOT: Eski projede updateAllProductsPrice() sadece bolbolbul + sopyo günceller!
  plugin_base.ts ise 6 pazaryerini de günceller.

### Stok Eşitleme
- toplam_stock, bolbolbul_stock, sopyo_stock aynı değere set edilir (plugin_base.ts:963-965)
- BizimHesap stoku ayrı takip edilir

### Ürün Kaydetme (INSERT vs UPDATE)
- tedarikci_product_id varsa → UPDATE
- yoksa → INSERT, sonra tedarikci_urunler.envanter_status = 1

### Frontend Fiyat Hesaplama
- Desi veya kategori değiştiğinde AJAX çağrısı
- `/categorieDetailForModal/:id` → kategori oranlarını getirir
- Client-side hesaplama yapılır
- Tüm fiyat alanları manuel override edilebilir

### Validation
- Frontend: kategori zorunlu, en az 1 görsel zorunlu
- Backend: validation YOK (eski projede)
- Yeni projede backend validation eklenmeli

---

## 5. Kademe Sıralaması — Yeni Kural (2026-04-26)

**Dosya:** `lib/utils/pricing.ts`

**Kural:** Kademe seçimi İNDİRİM SONRASI baseFiyat ile yapılır.

```ts
// 1. Önce iskonto uygulanır
const baseFiyat = basePrice - (basePrice * supplierDiscount / 100)

// 2. Sonra kademe seçilir (indirim sonrası fiyatla)
const kategoriOran = await getCommissionRate(categoryId, baseFiyat)
```

**Not:** Eski projede indirim ÖNCESİ fiyatla seçim yapılıyordu, ancak yeni projede kullanıcı kararıyla bu sıra tersine çevrildi — mantık olarak gerçek maliyet (baseFiyat) üzerinden kademe değerlendirmek daha tutarlı.
