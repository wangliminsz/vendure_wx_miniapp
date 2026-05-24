const config = {

  fastapiUrl: "https://bkkapi.favor100.site",
  
  baseUrl: 'http://192.168.0.51:3000/shop-api',
  // CHANNEL_TOKEN: '3u7xpg60e4lc7stp7vac', //channel-token-for-default
  // CHANNEL_TOKEN: 'the-channel-token-for-channel-dsy',

  development: {
    API_URL: 'http://192.168.0.51:3000/shop-api',
    GRAPHQL_URL: 'http://192.168.0.51:3000',
  },

  production: {
    API_URL: 'http://192.168.0.51:3000/shop-api',
    GRAPHQL_URL: 'http://192.168.0.51:3000',
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


  avatarImg: "/static/images/get_avatar.png",
  cloudEnvId: "bkkschool-1304214433-4bo349633e7",
  cloudAppId: 'wx65ce07b8050f8ae4',


  hotSearch: [
    { keyword: 'Computer', count: 1005 },
    { keyword: 'Plant', count: 986 },
    { keyword: 'Camera', count: 854 },
    { keyword: 'Plants', count: 765 },
  ],
  
};

module.exports = config;
