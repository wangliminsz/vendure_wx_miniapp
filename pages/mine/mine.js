const app = getApp();
// logs.js
const util = require('../../utils/util.js')
const config = require('../../config.js');

Page({
  data: {

    baseUrl: config.fastapiUrl,

    userInfoExist: false,
    userOpenId: '',
    userAvatarUrl: config.avatarImg,
    userNickName: '',
    userMobile: '',
    userMobileColor: '#707070', // 初始文本颜色

    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
    canUserGetUserProfile: false

  },

  returnToHome: function () {
    wx.switchTab({
      url: '/pages/home/home',
      success: () => {
        console.log('Switched to Homepage');
      }
    });
  },

  async onLoad() {
    console.log("config.fastapiUrl--->", `${config.fastapiUrl}`)
    console.log("config.fastapiUrl--->", this.data.baseUrl)

    const openid = wx.getStorageSync('openid');
    const avatarurl = wx.getStorageSync('avatarurl');
    const nickname = wx.getStorageSync('nickname');
    const mobile = wx.getStorageSync('mobile');

    //local Storage
    try {
      if (!openid) {
        const res = await this.checkOpenId_Local()
      } else {
        this.setData({
          userOpenId: openid,
        }, () => {
          console.log("login onLoad localStorage openid--->", this.data.userOpenId);
        });
      }

    } catch (e) {
      console.error('Error retrieving OpenID from local storage:', e);
    };

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    //cloud Database 
    if (!avatarurl || avatarurl === `${config.avatarImg}` || !nickname) {
      try {
        if (!openid) {
          const res = await this.checkOpenId()
        } else {
          const res = await this.cloudDbRead(openid)
        }
      } catch (e) {
        console.error('Error get OpenID from Cloud Db:', e);
      };
    }

  },

  async onShow() {

    const openid = wx.getStorageSync('openid');
    const avatarurl = wx.getStorageSync('avatarurl');
    const nickname = wx.getStorageSync('nickname');
    const mobile = wx.getStorageSync('mobile');

    //local Storage
    try {
      if (!openid) {
        const res = await this.checkOpenId_Local()
      } else {
        this.setData({
          userOpenId: openid,
        }, () => {
          console.log("login onShow get openid--->", this.data.userOpenId);
        });
      }

      if (!avatarurl || avatarurl === `${config.avatarImg}`) {} else {
        this.setData({
          userAvatarUrl: avatarurl
        }, () => {
          console.log("localStorage Read avatar nickname--->", this.data.userAvatarUrl,
            this.data.userNickName);
        });
      }

      if (!nickname) {} else {
        this.setData({
          userNickName: nickname
        }, () => {
          console.log("localStorage Read avatar nickname--->", this.data.userAvatarUrl,
            this.data.userNickName);
        });
      }

      if (!mobile) {} else {
        this.setData({
          userMobile: mobile,
        }, () => {
          console.log("localStorage Read mobile --->", this.data.userMobile);
        });
      }

    } catch (e) {
      console.error('Error retrieving OpenID from local storage:', e);
    };
  },

  async checkOpenId_Local() {
    try {
      const openid = await this.retrieveOpenIdFromServer();
      if (openid) {
        wx.setStorageSync('openid', openid);
        this.setData({
          userOpenId: openid,
        });

        // Check if the user exists in the cloud database
        console.log("openid, login onLoad, from cloud db--->")
      } else {
        console.error('Failed to retrieve OpenID from server');
      }
    } catch (e) {
      console.error('Error retrieving OpenID from server:', e);
    }
  },

  async checkOpenId() {
    try {
      const openid = await this.retrieveOpenIdFromServer();
      if (openid) {
        wx.setStorageSync('openid', openid);
        this.setData({
          userOpenId: openid,
        });

        // Check if the user exists in the cloud database
        const res = await this.cloudDbRead(openid);
        console.log("onLoad from Cloud Db Read--->", res)
      } else {
        console.error('Failed to retrieve OpenID from server');
      }
    } catch (e) {
      console.error('Error retrieving OpenID from server:', e);
    }
  },

  async retrieveOpenIdFromServer() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: res => {
          if (res.code) {
            // Send the code to the backend server
            wx.request({
              url: `${config.fastapiUrl}/api/checkArkLoginStatus`, // Your server endpoint
              method: 'POST',
              data: {
                code: res.code
              },
              success: res => {
                // console.log('from Server --->>>', res);
                if (res.data && res.data.openid) {
                  resolve(res.data.openid);
                } else {
                  reject('No openid returned from server');
                }
              },
              fail: err => {
                console.error('Failed to check login status:', err);
                reject(err);
              }
            });
          } else {
            console.error('Login failed:', res.errMsg);
            reject(res.errMsg);
          }
        }
      });
    });
  },

  async cloudDbRead(openid) {
    const app = getApp();
    if (!app.cloud) {
      console.error('Cloud is not initialized');
      return null;
    }

    const db = app.cloud.database();
    const userCollection = db.collection('user');

    try {
      const res = await userCollection.where({
        _openid: openid
      }).get();

      if (res.data.length > 0) {
        const userInfo = res.data[0];
        console.log('User info from cloud:', userInfo);

        this.setData({
          userOpenId: openid,
          userAvatarUrl: res.data[0].avatarurl,
          userNickName: res.data[0].nickname,
          userMobile: res.data[0].mobile
        }, () => {
          wx.setStorageSync('avatarurl', res.data[0].avatarurl);
          wx.setStorageSync('nickname', res.data[0].nickname);
          wx.setStorageSync('mobile', res.data[0].mobile);
          console.log("onDB Read setData ASYNC--->", this.data.userOpenId, this.data.userAvatarUrl,
            this.data.userNickName, this.data.userMobile);
        });
        return userInfo;
      } else {
        console.log('No user info in cloud for openid');
        return null;
      }
    } catch (err) {
      console.error('Error from cloud database:', err);
      return null;
    }
  },

  updateUserInfo2: function () {
    wx.navigateTo({
      url: '/pages/mine/register',
      success: function (res) {
        console.log('Navigation to /mine/register successful');
      },
      fail: function (err) {
        console.error('Navigation to /mine/register failed', err);
      }
    });
  },

  // ~~~~~~~~~~~~~~~~~~~~~~~
  // 分享给朋友，分享到朋友圈

  onShareAppMessage: function () {
    // const thisUrl = this.data.theUrl;
    console.log('from login Page, Share Msg Action--->')
    return {
      title: '优材工品',
      path: '/pages/mine/mine',
    };
  },

  // onShareTimeline

  onShareTimeline: function () {
    // const thisUrl = this.data.theUrl;
    console.log('from login Page, Share TL Action--->')
    return {
      title: '优材工品',
      path: '/pages/mine/mine',
    };
  },


  //  ~~~~~~~~~~~~~~~~~~~~~~

})