module.exports = {
  apps: [
    {
      name: 'adflow-api',
      script: './apps/api/dist/index.js',
      cwd: '/root/adflow',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 6000,
      },
    },
    {
      name: 'adflow-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3020',
      cwd: '/root/adflow/apps/web',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3020,
      },
    },
  ],
};
