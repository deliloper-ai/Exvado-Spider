# products (Katalog Ürünleri) — Faz 3

> Bu dosyaya DB'deki `products` tablosunun yapısını yapıştır.
> `DESCRIBE products;` veya phpMyAdmin'den kopyala.

1	id	int	NULL	NULL	NO	NULL	auto_increment		
2	sopyo_id	int	NULL	NULL	YES	NULL			
3	name	varchar(255)	utf8mb4	utf8mb4_general_ci	NO	NULL			
4	supplier	varchar(255)	utf8mb4	utf8mb4_general_ci	YES	NULL			
5	stock_code	varchar(100)	utf8mb4	utf8mb4_general_ci	YES	NULL			
6	brand	varchar(255)	utf8mb4	utf8mb4_general_ci	YES	NULL			
7	barcode	varchar(100)	utf8mb4	utf8mb4_general_ci	YES	NULL			
8	desi	decimal(10,2)	NULL	NULL	YES	NULL			
9	eticaret	tinyint(1)	NULL	NULL	YES	NULL			
10	sopyo	int	NULL	NULL	YES	NULL			
11	attributes	text	utf8mb4	utf8mb4_general_ci	YES	NULL			
12	kategori_id	int	NULL	NULL	YES	NULL			
13	tedarikci_fiyat	decimal(10,2)	NULL	NULL	YES	NULL			
14	product_discount	decimal(10,2)	NULL	NULL	YES	NULL			
15	bolbolbul_fiyat	decimal(10,2)	NULL	NULL	YES	NULL			
16	sopyo_fiyat	decimal(10,2)	NULL	NULL	YES	NULL			
17	toplam_stock	int	NULL	NULL	YES	NULL			
18	bizimhesap_stock	int	NULL	NULL	YES	NULL			
19	bolbolbul_stock	int	NULL	NULL	YES	NULL			
20	sopyo_stock	int	NULL	NULL	YES	NULL			
21	meta_title	varchar(255)	utf8mb4	utf8mb4_general_ci	YES	NULL			
22	meta_desc	text	utf8mb4	utf8mb4_general_ci	YES	NULL			
23	detay_bilgileri	text	utf8mb4	utf8mb4_general_ci	YES	NULL			
24	tedarikci_product_id	int	NULL	NULL	YES	NULL			
25	kdv	int	NULL	NULL	YES	NULL			
26	images	text	utf8mb4	utf8mb4_general_ci	YES	NULL			
27	send_sopyo_check	int	NULL	NULL	YES	NULL			
28	send_eticaret_check	int	NULL	NULL	YES	NULL			
29	trendyol_fiyat	decimal(10,2)	NULL	NULL	YES	NULL			
30	n11_fiyat	decimal(10,2)	NULL	NULL	YES	NULL			
31	pazarama_fiyat	decimal(10,2)	NULL	NULL	YES	NULL			
32	hepsiburada_fiyat	decimal(10,2)	NULL	NULL	YES	NULL			
33	isFiyatTercih	int	NULL	NULL	YES	0			