# tedarikci_cron (Tedarikçi Sync Logları)

> Bu dosyaya DB'deki `tedarikci_cron` tablosunun yapısını yapıştır.
> `DESCRIBE tedarikci_cron;` veya phpMyAdmin'den kopyala.

1	id	int	NULL	NULL	NO	NULL	auto_increment		
2	name	varchar(255)	utf8mb4	utf8mb4_general_ci	YES	NULL			
3	status	int	NULL	NULL	YES	NULL			
4	created_at	timestamp	NULL	NULL	YES	CURRENT_TIMESTAMP	DEFAULT_GENERATED		
5	error	text	utf8mb4	utf8mb4_general_ci	YES	NULL			
6	created_count	int	NULL	NULL	YES	0			
7	updated_count	int	NULL	NULL	YES	0			
8	time	varchar(255)	utf8mb4	utf8mb4_general_ci	YES	NULL			
9	total_count	int	NULL	NULL	YES	NULL			
10	exist_count	int	NULL	NULL	YES	NULL			
11	response_time	decimal(10,2)	NULL	NULL	YES	0.00			
12	error_category	varchar(100)	utf8mb4	utf8mb4_general_ci	YES	NULL			
13	products_processed	int	NULL	NULL	YES	0			