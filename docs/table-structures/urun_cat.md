# urun_cat (Kategoriler)

> Bu dosyaya DB'deki `urun_cat` tablosunun yapısını yapıştır.
> `DESCRIBE urun_cat;` veya phpMyAdmin'den kopyala.

1	id	int	NULL	NULL	NO	NULL	auto_increment		
2	baslik	varchar(222)	utf8mb3	utf8mb3_general_ci	YES	NULL			
3	baslik_seo	varchar(222)	utf8mb3	utf8mb3_general_ci	YES	NULL			
4	spot	text	utf8mb3	utf8mb3_general_ci	YES	NULL			
5	dil	varchar(22)	utf8mb3	utf8mb3_general_ci	YES	NULL			
6	tags	text	utf8mb3	utf8mb3_general_ci	YES	NULL			
7	meta_desc	text	utf8mb3	utf8mb3_general_ci	YES	NULL			
8	ust_id	varchar(22)	utf8mb3	utf8mb3_general_ci	YES	NULL			
9	sira	int	NULL	NULL	YES	NULL			
10	durum	varchar(2)	utf8mb3	utf8mb3_general_ci	YES	NULL			
11	seo_url	text	utf8mb3	utf8mb3_general_ci	YES	NULL			
12	marka_filtre	varchar(2)	utf8mb3	utf8mb3_general_ci	YES	NULL			
13	ozellik_filtre	varchar(2)	utf8mb3	utf8mb3_general_ci	YES	NULL			
14	fiyat_filtre	varchar(2)	utf8mb3	utf8mb3_general_ci	YES	NULL			
15	n11_kat_id	varchar(15)	utf8mb3	utf8mb3_general_ci	YES	0			
16	n11_kat_isim	text	utf8mb3	utf8mb3_general_ci	YES	NULL			
17	n11_ozellik	text	utf8mb3	utf8mb3_general_ci	YES	NULL			
18	anasayfa	varchar(1)	utf8mb3	utf8mb3_general_ci	YES	1			
19	ikon	text	utf8mb3	utf8mb3_general_ci	YES	NULL			
20	anasayfa_html	text	utf8mb3	utf8mb3_general_ci	YES	NULL			
21	anasayfa_tur	varchar(1)	utf8mb3	utf8mb3_general_ci	YES	NULL			
22	seo_desc	text	utf8mb3	utf8mb3_general_ci	YES	NULL			
23	sopyo_id	varchar(255)	utf8mb3	utf8mb3_general_ci	YES	NULL			
24	sopyo_status	int	NULL	NULL	YES	0			
25	sopyo_oran	int	NULL	NULL	YES	0			
26	kategori_oran_1	int	NULL	NULL	YES	NULL			
27	kategori_oran_5	int	NULL	NULL	YES	NULL			
28	kategori_oran_4	int	NULL	NULL	YES	NULL			
29	kategori_oran_3	int	NULL	NULL	YES	NULL			
30	kategori_oran_2	int	NULL	NULL	YES	NULL			
31	kategori_oran_6	int	NULL	NULL	YES	NULL			
32	kategori_oran_7	int	NULL	NULL	YES	NULL			
33	kategori_oran_8	int	NULL	NULL	YES	NULL			
34	kategori_oran_9	int	NULL	NULL	YES	NULL			
35	kategori_oran_10	int	NULL	NULL	YES	NULL			
36	kategori_oran_11	int	NULL	NULL	YES	NULL			
37	kategori_oran_12	int	NULL	NULL	YES	NULL			
38	kategori_oran_13	int	NULL	NULL	YES	NULL			
39	kategori_oran_15	int	NULL	NULL	YES	NULL			
40	kategori_oran_14	int	NULL	NULL	YES	NULL			
41	kategori_oran_16	int	NULL	NULL	YES	NULL			
42	kategori_oran_17	int	NULL	NULL	YES	NULL			
43	kategori_oran_10_20	int	NULL	NULL	YES	NULL			
44	n11_oran	int	NULL	NULL	YES	NULL			
45	hepsiburada_oran	int	NULL	NULL	YES	NULL			
46	pazarama_oran	int	NULL	NULL	YES	NULL			
47	trendyol_oran	int	NULL	NULL	YES	NULL			
48	ticimax_id	int	NULL	NULL	YES	NULL			