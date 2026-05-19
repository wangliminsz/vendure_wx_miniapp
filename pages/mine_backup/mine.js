const app = getApp();

Page({
  data: {
    userInfo: {
      avatar: '',
      name: '',
      mobile: '',
    },
    customerInfo: {
      company: '优材工品科技有限公司',
      level: '金牌会员',
      creditLimit: '50000.00',
    },
    isLoggedIn: false,
    userOpenId: '',
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
    this.updateCartBadge();
  },

  checkLoginStatus() {
    const avatarUrl = wx.getStorageSync('user_avatar');
    const nickName = wx.getStorageSync('user_nickname');
    const mobile = wx.getStorageSync('user_mobile');
    const openId = wx.getStorageSync('openid');

    const isLoggedIn = avatarUrl && nickName;

    this.setData({
      isLoggedIn,
      userOpenId: openId || '',
      userInfo: {
        avatar: avatarUrl || '',
        name: nickName || '',
        mobile: mobile || '',
      },
    });
  },

  updateCartBadge() {
    const cartCount = app.getCartCount();
    if (cartCount > 0) {
      wx.setTabBarBadge({
        index: 2,
        text: String(cartCount),
      });
    } else {
      wx.removeTabBarBadge({
        index: 2,
      });
    }
  },

  onChooseAvatar(e) {
    console.log('onChooseAvatar:', e);
    const { avatarUrl } = e.detail;
    console.log('Selected avatar:', avatarUrl);
    
    this.setData({
      userInfo: {
        ...this.data.userInfo,
        avatar: avatarUrl,
      },
    });
    
    wx.setStorageSync('user_avatar', avatarUrl);
  },

  onNicknameInput(e) {
    const nickName = e.detail.value;
    this.setData({
      userInfo: {
        ...this.data.userInfo,
        name: nickName,
      },
    });
  },

  onLogin() {
    const { avatar, name } = this.data.userInfo;
    
    if (!avatar) {
      wx.showToast({
        title: '请选择头像',
        icon: 'none',
      });
      return;
    }
    
    if (!name) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none',
      });
      return;
    }

    wx.setStorageSync('user_avatar', avatar);
    wx.setStorageSync('user_nickname', name);
    
    this.setData({
      isLoggedIn: true,
    });

    this.getOpenId();

    wx.showToast({
      title: '登录成功',
      icon: 'success',
    });
  },

  getOpenId() {
    wx.login({
      success: (res) => {
        if (res.code) {
          console.log('Login code:', res.code);
          wx.setStorageSync('wx_login_code', res.code);
        } else {
          console.error('Login failed:', res.errMsg);
        }
      },
      fail: (err) => {
        console.error('wx.login failed:', err);
      }
    });
  },

  getPhoneNumber(e) {
    console.log('getPhoneNumber:', e);
    
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      const encryptedData = e.detail.encryptedData;
      const iv = e.detail.iv;
      
      console.log('Encrypted data:', encryptedData);
      console.log('IV:', iv);
      
      wx.setStorageSync('user_mobile', '已绑定手机号');
      
      this.setData({
        userInfo: {
          ...this.data.userInfo,
          mobile: '已绑定手机号',
        },
      });

      wx.showToast({
        title: '手机号绑定成功',
        icon: 'success',
      });
    } else {
      wx.showToast({
        title: '授权失败',
        icon: 'none',
      });
    }
  },

  onUserInfoTap() {
    if (!this.data.isLoggedIn) {
      return;
    } else {
      wx.navigateTo({
        url: '/pages/profile/profile',
      });
    }
  },

  goToOrders(e) {
    const status = e.currentTarget.dataset.status || 'all';
    wx.navigateTo({
      url: `/pages/orders/orders?status=${status}`,
    });
  },

  goToPage(e) {
    const url = e.currentTarget.dataset.url;

    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            return;
          }
        },
      });
      return;
    }

    wx.navigateTo({
      url,
    });
  },

  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话: 400-888-8888\n工作时间: 9:00-18:00',
      showCancel: false,
    });
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('user_avatar');
          wx.removeStorageSync('user_nickname');
          wx.removeStorageSync('user_mobile');
          wx.removeStorageSync('openid');
          wx.removeStorageSync('wx_login_code');
          this.setData({
            isLoggedIn: false,
            userInfo: {
              avatar: '',
              name: '',
              mobile: '',
            },
            userOpenId: '',
          });
          wx.showToast({
            title: '已退出登录',
            icon: 'success',
          });
        }
      },
    });
  },
});
