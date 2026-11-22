# urun_marka (Markalar)

> Bu dosyaya DB'deki `urun_marka` tablosunun yapısını yapıştır.
> `DESCRIBE urun_marka;` veya phpMyAdmin'den kopyala.

1	id	int	NULL	NULL	NO	NULL	auto_increment		
2	baslik	varchar(222)	utf8mb4	utf8mb4_general_ci	YES	NULL			
3	baslik_seo	varchar(222)	utf8mb4	utf8mb4_general_ci	YES	NULL			
4	seo_url	text	utf8mb4	utf8mb4_general_ci	YES	NULL			
5	gorsel	varchar(222)	utf8mb4	utf8mb4_general_ci	YES	NULL			
6	gorsel_anasayfa	varchar(222)	utf8mb4	utf8mb4_general_ci	YES	NULL			
7	spot	text	utf8mb4	utf8mb4_general_ci	YES	NULL			
8	sira	int	NULL	NULL	YES	NULL			
9	durum	varchar(2)	utf8mb4	utf8mb4_general_ci	YES	NULL			
10	anasayfa	varchar(2)	utf8mb4	utf8mb4_general_ci	YES	NULL			
11	tags	text	utf8mb4	utf8mb4_general_ci	YES	NULL			
12	meta_desc	text	utf8mb4	utf8mb4_general_ci	YES	NULL			
13	sopyo_status	int	NULL	NULL	YES	NULL			
14	sopyo_id	int	NULL	NULL	YES	NULL			
15	ticimax_id	int	NULL	NULL	YES	NULL			