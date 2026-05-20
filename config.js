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
  cloudAppId: 'wx65ce07b8050f8ae4'

   // 实例化共享环境
  //  const mycloud = new wx.cloud.Cloud({
  //   resourceAppid: 'wx65ce07b8050f8ae4', // 资源方AppID
  //   resourceEnv: 'bkkschool-1304214433-4bo349633e7' // 共享给你的环境ID
  // })
  
};

module.exports = config;
