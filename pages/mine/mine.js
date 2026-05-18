const app = getApp();
const { auth } = require('../../utils/auth.js');

Page({
  data: {
    userInfo: {},
    customerInfo: {
      company: '优材工品科技有限公司',
      level: '金牌会员',
      creditLimit: '50000.00',
    },
    isLoggedIn: false,
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
    this.updateCartBadge();
  },

  checkLoginStatus() {
    const isLoggedIn = auth.isLoggedIn();
    const customerInfo = auth.getCustomerInfo();

    this.setData({
      isLoggedIn,
      userInfo: isLoggedIn ? customerInfo || {} : {},
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

  onUserInfoTap() {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/login/login',
      });
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
            wx.navigateTo({
              url: '/pages/login/login',
            });
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
          auth.logout();
          this.setData({
            isLoggedIn: false,
            userInfo: {},
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
