// PM2 Ecosystem Configuration for Nexora Finance
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: "nexora-finance",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/nexora-finances",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "1G",
      autorestart: true,
      watch: false,
      error_file: "/var/log/nexora/error.log",
      out_file: "/var/log/nexora/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      time: true,
    },
  ],
};
