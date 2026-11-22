/**
 * PM2 Process Manager Config
 *
 * Kullanım:
 *   pm2 start ecosystem.config.js               # Worker'ı başlat
 *   pm2 stop exvado-worker                       # Durdur
 *   pm2 restart exvado-worker                    # Yeniden başlat
 *   pm2 logs exvado-worker                       # Log'ları izle
 *   pm2 startup                                  # Sistem başlangıcına ekle
 *
 * Sadece worker process'i için config — Next.js dev/start ayrı çalışır.
 */
module.exports = {
  apps: [
    {
      name: 'exvado-worker',
      script: 'node',
      args: 'worker-dist/index.js --cron',
      cwd: __dirname,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        ESBUILD_BINARY_PATH: '/opt/esbuild/esbuild',
      },
      error_file: './worker/logs/pm2-error.log',
      out_file: './worker/logs/pm2-out.log',
      time: true,
    },
  ],
}
