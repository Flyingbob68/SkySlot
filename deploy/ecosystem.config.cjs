module.exports = {
  apps: [
    {
      name: 'skyslot-api',
      script: './backend/dist/index.js',
      cwd: '/opt/skyslot',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/skyslot/api-error.log',
      out_file: '/var/log/skyslot/api-out.log',
      merge_logs: true,
      max_memory_restart: '256M',
    },
  ],
};
