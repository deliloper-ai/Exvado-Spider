# tedarikci_urunler (Tedarikçi Ürünleri)

> Bu dosyaya DB'deki `tedarikci_urunler` tablosunun yapısını yapıştır.
> `DESCRIBE tedarikci_urunler;` veya phpMyAdmin'den kopyala.

1	id	int	NULL	NULL	NO	NULL	auto_increment		
2	supplier_name	varchar(255)	utf8mb4	utf8mb4_general_ci	YES	NULL			
3	productTitle	varchar(255)	utf8mb4	utf8mb4_general_ci	YES	NULL			
4	productCode	varchar(100)	utf8mb4	utf8mb4_general_ci	YES	NULL			
5	netPriceWithVAT	decimal(10,2)	NULL	NULL	YES	NULL			
6	productPictures	text	utf8mb4	utf8mb4_general_ci	YES	NULL			
7	productStockStatus	varchar(50)	utf8mb4	utf8mb4_general_ci	YES	NULL			
8	envanter_status	int	NULL	NULL	YES	0			
9	stock	int	NULL	NULL	YES	NULL			
10	brand	varchar(255)	utf8mb4	utf8mb4_general_ci	YES	NULL			
11	updated_at	timestamp	NULL	NULL	NO	CURRENT_TIMESTAMP	on update CURRENT_TIMESTAMP		
12	bizimhesap_fiyat	decimal(10,2)	NULL	NULL	YES	NULL			
13	isFiyatTercih	int	NULL	NULL	YES	0			
14	bizimhesap_stock	int	NULL	NULL	YES	NULL			