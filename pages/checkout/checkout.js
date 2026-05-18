const app = getApp();
const { createAddress } = require('../../providers/shop/customer/customer');

Page({
  data: {
    selectedAddress: null,
    cartItems: [],
    remark: '',
    paymentMethod: 'wechat',
    goodsAmount: '0.00',
    shippingFee: '50.00',
    discountAmount: '0.00',
    totalAmount: '0.00',
    totalCount: 0,
  },

  onLoad() {
    this.loadCheckoutData();
  },

  onShow() {
    const address = wx.getStorageSync('temp_selected_address');
    if (address) {
      this.setData({
        selectedAddress: address,
      });
      wx.removeStorageSync('temp_selected_address');
    }
  },

  loadCheckoutData() {
    const cartItems = app.getCartItems().filter(item => item.selected);
    const goodsAmount = cartItems.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0).toFixed(2);

    const totalAmount = (parseFloat(goodsAmount) + parseFloat(this.data.shippingFee) - parseFloat(this.data.discountAmount)).toFixed(2);
    const totalCount = cartItems.reduce((count, item) => count + item.quantity, 0);

    this.setData({
      cartItems,
      goodsAmount,
      totalAmount,
      totalCount,
    });
  },

  onSelectAddress() {
    wx.navigateTo({
      url: '/pages/address/address?mode=select',
    });
  },

  onPaymentMethodChange(e) {
    this.setData({
      paymentMethod: e.detail.value,
    });
  },

  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value,
    });
  },

  canSubmit() {
    return this.data.selectedAddress && this.data.cartItems.length > 0;
  },

  async onSubmitOrder() {
    if (!this.canSubmit()) {
      wx.showToast({
        title: '请完善订单信息',
        icon: 'none',
      });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      app.clearCart();

      app.globalData.orderRefresh = true;

      wx.showModal({
        title: '订单提交成功',
        content: '您的订单已提交，请等待商家确认',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/mine/mine',
          });
        },
      });
    } catch (error) {
      console.error('Failed to submit order:', error);
      wx.showToast({
        title: '提交失败',
        icon: 'none',
      });
    } finally {
      wx.hideLoading();
    }
  },
});
