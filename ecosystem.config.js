module.exports = {
  apps: [
    {
      name: 'mck-discord-logs',
      script: './dist/src/index.js',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
