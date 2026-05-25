const app = getApp();

class Auth {
  getToken() {
    if (!app.globalData.token) {
      app.globalData.token = wx.getStorageSync('vendure_token') || '';
    }
    return app.globalData.token;
  }

  setToken(token) {
    app.globalData.token = token;
    wx.setStorageSync('vendure_token', token);
  }

  getCustomerInfo() {
    if (!app.globalData.customerInfo) {
      app.globalData.customerInfo = wx.getStorageSync('customer_info') || null;
    }
    return app.globalData.customerInfo;
  }

  setCustomerInfo(info) {
    app.globalData.customerInfo = info;
    wx.setStorageSync('customer_info', info);
  }

  isLoggedIn() {
    return !!this.getToken();
  }

  logout() {
    app.globalData.token = '';
    app.globalData.customerInfo = null;
    wx.removeStorageSync('vendure_token');
    wx.removeStorageSync('customer_info');
    app.clearCart();
  }

  requireLogin(callback) {
    if (this.isLoggedIn()) {
      if (callback) callback();
    } else {
      wx.showModal({
        title: '提示',
        content: '请先注册/登录',
        success(res) {
          if (res.confirm) {
            // ✅ 跳 tabBar 页面必须用 switchTab
            wx.switchTab({
              url: '/pages/mine/mine',
            });
          }
        },
      });
    }
  }

}

const auth = new Auth();

module.exports = {
  auth,
  Auth,
};
