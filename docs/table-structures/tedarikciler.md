# tedarikciler (Tedarikçiler)

> Bu dosyaya DB'deki `tedarikciler` tablosunun yapısını yapıştır.
> `DESCRIBE tedarikciler;` veya phpMyAdmin'den kopyala.

1	id	int	NULL	NULL	NO	NULL	auto_increment		
2	name	varchar(255)	utf8mb4	utf8mb4_general_ci	YES	NULL			
3	status	int	NULL	NULL	YES	1			
4	discount	int	NULL	NULL	YES	0			
5	image_url	varchar(255)	utf8mb4	utf8mb4_general_ci	YES	NULL			
6	sira	int	NULL	NULL	YES	NULL			
7	token	text	utf8mb4	utf8mb4_general_ci	YES	NULL			
8	updated_at	timestamp	NULL	NULL	YES	CURRENT_TIMESTAMP	on update CURRENT_TIMESTAMP		
9	new_script_status	int	NULL	NULL	YES	0			
10	euro_kur	decimal(10,2)	NULL	NULL	YES	NULL			
11	dolar_kur	decimal(10,2)	NULL	NULL	YES	NULL			