const app = getApp();
const config = require('../../config.js');

Page({
  data: {
    userAvatarUrl: '',
    userNickName: '',
    userOpenId: '',
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const avatarUrl = wx.getStorageSync('user_avatar');
    const nickName = wx.getStorageSync('user_nickname');
    const openId = wx.getStorageSync('openid');

    this.setData({
      userAvatarUrl: avatarUrl || '',
      userNickName: nickName || '',
      userOpenId: openId || '',
    });
  },

  returnToHome() {
    wx.switchTab({
      url: '/pages/home/home',
      success: () => {
        console.log('Switched to Homepage');
      }
    });
  },

  onWechatLogin() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        console.log('User profile:', res);
        
        const userInfo = res.userInfo;
        this.setData({
          userAvatarUrl: userInfo.avatarUrl,
          userNickName: userInfo.nickName,
        });

        wx.setStorageSync('user_avatar', userInfo.avatarUrl);
        wx.setStorageSync('user_nickname', userInfo.nickName);

        this.loginWithVendure(userInfo);
      },
      fail: (err) => {
        console.error('Failed to get user profile:', err);
        wx.showToast({
          title: '授权失败',
          icon: 'none',
        });
      }
    });
  },

  async loginWithVendure(userInfo) {
    try {
      wx.showLoading({
        title: '登录中...',
      });

      const code = await this.login();
      if (!code) {
        wx.hideLoading();
        return;
      }

      const result = await this.registerWithVendure(code, userInfo);
      if (result) {
        wx.hideLoading();
        wx.showToast({
          title: '登录成功',
          icon: 'success',
        });
        
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/home/home',
          });
        }, 1500);
      } else {
        wx.hideLoading();
        wx.showToast({
          title: '登录失败',
          icon: 'none',
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('Login error:', error);
      wx.showToast({
        title: '登录失败',
        icon: 'none',
      });
    }
  },

  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            resolve(res.code);
          } else {
            reject(res.errMsg);
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  registerWithVendure(code, userInfo) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${config.development.API_URL}/auth/anonymous`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'vendure-token': config.CHANNEL_TOKEN,
        },
        data: JSON.stringify({
          code: code,
          userInfo: userInfo,
        }),
        success: (res) => {
          console.log('Vendure auth response:', res);
          if (res.statusCode === 200 && res.data) {
            const token = res.data.token;
            if (token) {
              wx.setStorageSync('vendure_token', token);
            }
            resolve(res.data);
          } else {
            reject('Failed to authenticate');
          }
        },
        fail: (err) => {
          console.error('Vendure auth failed:', err);
          reject(err);
        }
      });
    });
  },

  showAgreement() {
    wx.showModal({
      title: '用户服务协议',
      content: '用户服务协议内容...',
      showCancel: false,
    });
  },

  showPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '隐私政策内容...',
      showCancel: false,
    });
  },

  onShareAppMessage() {
    return {
      title: '优材工品',
      path: '/pages/home/home',
    };
  },

  onShareTimeline() {
    return {
      title: '优材工品',
      path: '/pages/home/home',
    };
  },
});
