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

  CATEGORIES: [
    { id: 1, name: '紧固件', icon: '/static/icons/category-fastener.png' },
    { id: 2, name: '轴承', icon: '/static/icons/category-bearing.png' },
    { id: 3, name: '工具', icon: '/static/icons/category-tool.png' },
    { id: 4, name: '电气', icon: '/static/icons/category-electrical.png' },
    { id: 5, name: '化工劳保', icon: '/static/icons/category-chemical.png' },
    { id: 6, name: '密封件', icon: '/static/icons/category-seal.png' },
    { id: 7, name: '进口专区', icon: '/static/icons/category-import.png' },
    { id: 8, name: '企业定制', icon: '/static/icons/category-custom.png' },
  ],
};

module.exports = config;
