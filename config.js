const config = {
  development: {
    API_URL: 'http://192.168.0.51:3000/shop-api',
    GRAPHQL_URL: 'http://192.168.0.51:3000',
  },
  production: {
    API_URL: 'https://shop.youcai-tool.com/shop-api',
    GRAPHQL_URL: 'https://shop.youcai-tool.com',
  },

  CHANNEL_TOKEN: '3u7xpg60e4lc7stp7vac',

  PAGE_SIZE: 10,

  FILTER_MODE: 'server',

  PAGE_REC_NUMBER: 12,

  PRODUCT_COLUMNS: 2,

  BANNER_INTERVAL: 10000,

  IMAGE_SIZES: {
    THUMBNAIL: '?w=200&h=200&format=webp',
    MEDIUM: '?w=400&h=400&format=webp',
    LARGE: '?w=800&h=800&format=webp',
  },
};

module.exports = config;
