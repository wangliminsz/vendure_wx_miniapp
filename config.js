const config = {

  baseUrl: 'http://192.168.0.51:3000/shop-api',
  CHANNEL_TOKEN: '3u7xpg60e4lc7stp7vac',

  development: {
    API_URL: 'http://192.168.0.51:3000/shop-api',
    GRAPHQL_URL: 'http://192.168.0.51:3000',
  },
  production: {
    API_URL: 'https://shop.youcai-tool.com/shop-api',
    GRAPHQL_URL: 'https://shop.youcai-tool.com',
  },


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

  fastapiUrl: "https://bkkapi.favor100.site",

  avatarImg: "/static/images/get_avatar.png",
  cloudEnvId: "bkkschool-1304214433-4bo349633e7",
  cloudAppId: 'wx65ce07b8050f8ae4',

  hotSearch: [
    { keyword: 'Computer', count: 1005 },
    { keyword: 'Plant', count: 986 },
    { keyword: '电动工具', count: 854 },
    { keyword: '密封圈', count: 765 },
    { keyword: '劳保手套', count: 654 },
    { keyword: '螺丝套装', count: 543 },
  ],
  
};

module.exports = config;
