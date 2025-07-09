module.exports = {
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      dns: false,
      child_process: false,
    };
    return config;
  },
  experimental: {
    serverActions: true,
  },
};