// PM2 process manager config
// Usage:
//   pm2 start ecosystem.config.js --env production
//   pm2 save && pm2 startup   (auto-start on reboot)

module.exports = {
  apps: [
    {
      name:             'lecturecraft-backend',
      script:           'dist/app.js',
      cwd:              './backend',
      instances:        'max',          // one per CPU core
      exec_mode:        'cluster',
      watch:            false,
      max_memory_restart: '512M',

      env: {
        NODE_ENV: 'development',
        PORT:     4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT:     4000,
      },

      // Logging
      out_file:    './logs/backend-out.log',
      error_file:  './logs/backend-error.log',
      merge_logs:  true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Graceful shutdown
      kill_timeout:   5000,
      wait_ready:     true,
      listen_timeout: 10000,

      // Auto-restart on crash
      autorestart:    true,
      restart_delay:  3000,
      max_restarts:   10,
    },
  ],
}
