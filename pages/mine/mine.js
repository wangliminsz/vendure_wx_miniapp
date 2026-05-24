const app = getApp();
const util = require('../../utils/util.js');
const config = require('../../config.js');

Page({
  data: {
    fastapiUrl: config.fastapiUrl,
    userInfoExist: false,
    userOpenId: '',
    userAvatarUrl: '',
    userNickName: '',
    userName: '',
    userMobile: '',
    userMobileColor: '#707070', 
    isLogin: false,
    isLoading: true
  },

  returnToHome: function () {
    wx.switchTab({
      url: '/pages/home/home'
    });
  },

  async onLoad() {
    wx.showLoading({ title: '加载中...', mask: true });

    await app.initPromise;
    await app.loginPromise;

    const openid = app.globalData.openid || wx.getStorageSync('openid');
    
    this.setData({
      userOpenId: openid,
      isLogin: app.globalData.isLogin
    });

    if (openid) {
      await this.cloudDbRead(openid);
    }

    this.readLocalStorageInfo();
    
    if (!this.data.userAvatarUrl) {
      this.setData({ userAvatarUrl: config.avatarImg });
    }

    if (app.globalData.isLogin) {
      await this.fetchVendureCustomerInfo();
    }
    
    this.setData({ isLoading: false });
    wx.hideLoading();
  },

  async onShow() {
    // 每次页面切回时，确保最新的资料能及时刷新刷新
    this.setData({
      isLogin: app.globalData.isLogin
    });
    this.readLocalStorageInfo();
    
    // 更新购物车徽章
    app.updateCartBadge();
    if (app.globalData.isLogin) {
      app.syncServerCartCount();
    }
  },

  /**
   * 提取本地缓存资料进行视图渲染
   */
  readLocalStorageInfo() {
    const avatarurl = wx.getStorageSync('avatarurl');
    const nickname = wx.getStorageSync('nickname');
    const mobile = wx.getStorageSync('mobile');
    const userName = wx.getStorageSync('userName');

    if (avatarurl && avatarurl !== `${config.avatarImg}`) {
      this.setData({ userAvatarUrl: avatarurl });
    }
    if (nickname) this.setData({ userNickName: nickname });
    if (mobile) this.setData({ userMobile: mobile });
    if (userName) this.setData({ userName: userName });
  },

  /**
   * 读取微信云数据库
   */
  async cloudDbRead(openid) {
    if (!app.cloud) {
      console.error('Cloud is not initialized');
      return null;
    }

    const db = app.cloud.database();
    const userCollection = db.collection('user');

    try {
      const res = await userCollection.where({
        openid: openid // 统一查询字段
      }).get();

      if (res.data.length > 0) {
        const userInfo = res.data[0];
        console.log('【云数据库】成功读取到个性化资料:', userInfo);

        this.setData({
          userAvatarUrl: userInfo.avatarurl || this.data.userAvatarUrl,
          userNickName: userInfo.nickname || this.data.userNickName,
          userMobile: userInfo.mobile || this.data.userMobile,
          userName: userInfo.userName || this.data.userName,
          userInfoExist: true
        });

        // 同步写回本地缓存，防止时差闪烁
        if (userInfo.avatarurl) wx.setStorageSync('avatarurl', userInfo.avatarurl);
        if (userInfo.nickname) wx.setStorageSync('nickname', userInfo.nickname);
        if (userInfo.mobile) wx.setStorageSync('mobile', userInfo.mobile);
        if (userInfo.userName) wx.setStorageSync('userName', userInfo.userName);

        return userInfo;
      } else {
        console.log('【云数据库】该 OpenID 暂未创建云端个性化记录');
        this.setData({ userInfoExist: false });
        return null;
      }
    } catch (err) {
      console.error('读取微信云数据库故障:', err);
      return null;
    }
  },

  async fetchVendureCustomerInfo() {
    const { graphqlClient } = require('../../utils/api.js');
    
    try {
      const query = `
        query GetMe {
          me {
            id
            identifier
          }
        }
      `;
      
      const data = await graphqlClient.query(query);
      console.log('fetchVendureCustomerInfo - data:', data);
      
      if (data?.me) {
        const customer = data.me;
        app.globalData.customerInfo = customer;
        
        // if (customer.lastName) {
        //   this.setData({ userName: customer.lastName });
        // }
        
        // if (customer.phoneNumber) {
        //   this.setData({ userMobile: customer.phoneNumber });
        // }
      }
    } catch (error) {
      console.error('获取Vendure用户信息失败:', error);
    }
  },

  updateUserInfo2: function () {
    wx.navigateTo({
      url: '/pages/mine/register'
    });
  },

  onShareAppMessage: function () {
    return { title: '优涂工品', path: '/pages/mine/mine' };
  },

  onShareTimeline: function () {
    return { title: '优涂工品', path: '/pages/mine/mine' };
  }
});