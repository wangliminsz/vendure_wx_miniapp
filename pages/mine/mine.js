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

  goToAddress: function () {
    wx.navigateTo({
      url: '/pages/address/address'
    });
  },

  async onLoad() {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });

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
      this.setData({
        userAvatarUrl: config.avatarImg
      });
    }

    if (app.globalData.isLogin) {
      await this.fetchVendureCustomerInfo();
    }

    this.setData({
      isLoading: false
    });
    wx.hideLoading();
  },

  async onShow() {
    console.log('1 Mine onShow --->')
    if (app.globalData.isLogin) {
      console.log('2 Mine onShow --->')
    }
    // 每次页面切回时，确保最新的资料能及时刷新
    this.setData({
      isLogin: app.globalData.isLogin
    });
    
    // 无论是否登录，都尝试读取云数据库数据（优先级更高）
    const openid = app.globalData.openid || wx.getStorageSync('openid');
    if (openid) {
      await this.cloudDbRead(openid);
    } else {
      // 如果没有 openid，也要重置数据
      this.setData({
        userAvatarUrl: config.avatarImg,
        userNickName: '',
        userName: '',
        userMobile: '',
        userInfoExist: false
      });
    }
    
    // 读取本地缓存作为补充（避免 cloudDbRead 失败时显示空白）
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
    } else if (!this.data.userAvatarUrl || this.data.userAvatarUrl === '') {
      // 如果没有有效的头像，设置默认头像
      this.setData({ userAvatarUrl: config.avatarImg });
    }
    if (nickname) {
      this.setData({ userNickName: nickname });
    } else {
      this.setData({ userNickName: '' });
    }
    if (mobile) {
      this.setData({ userMobile: mobile });
    } else {
      this.setData({ userMobile: '' });
    }
    if (userName) {
      this.setData({ userName: userName });
    } else {
      this.setData({ userName: '' });
    }
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

        // 处理云数据库中的空字符串，正确设置数据
        this.setData({
          userAvatarUrl: userInfo.avatarurl ? userInfo.avatarurl : config.avatarImg,
          userNickName: userInfo.nickname ? userInfo.nickname : '',
          userMobile: userInfo.mobile ? userInfo.mobile : '',
          userName: userInfo.userName ? userInfo.userName : '',
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
        this.setData({
          userInfoExist: false
        });
        return null;
      }
    } catch (err) {
      console.error('读取微信云数据库故障:', err);
      return null;
    }
  },

  async fetchVendureCustomerInfo() {
    try {
      // 确保 graphqlClient 存在且已初始化
      const api = require('../../utils/api.js');
      if (!api.graphqlClient) {
        console.warn('graphqlClient 未初始化');
        return;
      }

      const {
        graphqlClient
      } = api;

      const query = `
        query GetMe {
          me {
            id
            identifier
          }
        }
      `;

      // 添加超时和错误处理
      const data = await graphqlClient.query(query).catch(err => {
        console.error('GraphQL 查询失败:', err);
        return null;
      });

      console.log('fetchVendureCustomerInfo - data:', data);

      // 添加更严格的空值检查
      if (data && data.me && typeof data.me === 'object') {
        const customer = data.me;
        app.globalData.customerInfo = customer;

        // 确保 customer 有值且不是 null 再进行后续操作
        if (customer && customer.id) {
          console.log('获取到用户信息:', customer.id);
        }
      } else {
        console.log('未获取到有效的用户信息');
      }
    } catch (error) {
      console.error('获取Vendure用户信息失败:', error);
      // 不抛出错误，避免影响页面渲染
    }
  },

  updateUserInfo2: function () {
    wx.navigateTo({
      url: '/pages/mine/register'
    });
  },

  unbindAccount: function () {
    wx.showModal({
      title: '确认解除绑定',
      content: '确定要解除微信与账户的绑定吗？解除后将清除本地登录状态。',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '正在解除绑定...'
          });

          try {
            const token = wx.getStorageSync('vendure-auth-token');
            const channelToken = app.globalData.activeChannelToken || '';

            const response = await new Promise((resolve, reject) => {
              wx.request({
                url: app.globalData.baseUrl,
                method: 'POST',
                header: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                  'vendure-token': channelToken
                },
                data: {
                  query: `mutation { unbindWechatAccount { success message } }`
                },
                success: (res) => {
                  if (res.data?.errors && res.data.errors.length > 0) {
                    reject(new Error(res.data.errors[0].message));
                  } else {
                    resolve(res.data);
                  }
                },
                fail: (err) => reject(err)
              });
            });

            const result = response?.data?.unbindWechatAccount;

            if (result?.success) {
              // 先清除云数据库数据
              if (app.cloud) {
                const db = app.cloud.database();
                const userCollection = db.collection('user');

                try {
                  const res = await userCollection.where({
                    openid: this.data.userOpenId
                  }).get();

                  if (res.data.length > 0) {
                    const docId = res.data[0]._id;
                    await userCollection.doc(docId).update({
                      data: {
                        avatarurl: '',
                        nickname: '',
                        mobile: '',
                        userName: '',
                      }
                    });
                  }
                } catch (err) {
                  console.error('清除云数据库数据失败:', err);
                }
              }

              // 清除本地存储
              wx.removeStorageSync('vendure-auth-token');
              app.globalData.isLogin = false;
              app.globalData.customerInfo = null;

              // 清除本地缓存
              wx.removeStorageSync('avatarurl');
              wx.removeStorageSync('nickname');
              wx.removeStorageSync('mobile');
              wx.removeStorageSync('userName');
              
              // 立即更新当前页面数据
              this.setData({
                isLogin: false,
                userAvatarUrl: config.avatarImg,
                userNickName: '',
                userName: '',
                userMobile: '',
                userInfoExist: false
              });

              wx.hideLoading();
              wx.showToast({
                title: '解除绑定成功',
                icon: 'success',
                duration: 2000,
                complete: () => {
                  setTimeout(() => {
                    // 刷新所有页面并跳转到首页
                    const pages = getCurrentPages();
                    pages.forEach(page => {
                      if (page.onShow) {
                        page.onShow();
                      }
                    });
                    wx.switchTab({
                      url: '/pages/home/home'
                    });
                  }, 2000);
                }
              });
            } else {
              wx.hideLoading();
              wx.showToast({
                title: result?.message || '解除绑定失败',
                icon: 'none'
              });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('解除绑定失败:', error);
            wx.showToast({
              title: error.message || '解除绑定失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  onShareAppMessage: function () {
    return {
      title: '优涂工品',
      path: '/pages/mine/mine'
    };
  },

  onShareTimeline: function () {
    return {
      title: '优涂工品',
      path: '/pages/mine/mine'
    };
  }
});
