const config = require('./config.js');

App({
  globalData: {
    userInfo: null,
    openid: '',
    token: '',
    cartItems: [],
    customerInfo: null,
  },

  onLaunch() {
    this.checkLoginStatus();
    this.initChannel();
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('vendure_token');
    const customerInfo = wx.getStorageSync('customer_info');

    if (token) {
      this.globalData.token = token;
      this.globalData.customerInfo = customerInfo;
    }
  },

  initChannel() {
    this.channelToken = config.CHANNEL_TOKEN;
  },

  async login(code) {
    try {
      const response = await wx.request({
        url: `${config.production.API_URL}/auth/authentication`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'vendure-token': config.CHANNEL_TOKEN,
        },
        data: {
          method: 'native',
          mobileNumber: code,
        },
      });

      if (response.data.token) {
        wx.setStorageSync('vendure_token', response.data.token);
        this.globalData.token = response.data.token;
        return response.data;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return null;
    }
  },

  setCartItems(items) {
    this.globalData.cartItems = items;
    wx.setStorageSync('cart_items', items);
  },

  getCartItems() {
    if (this.globalData.cartItems.length === 0) {
      this.globalData.cartItems = wx.getStorageSync('cart_items') || [];
    }
    return this.globalData.cartItems;
  },

  addToCart(product, quantity = 1) {
    const cartItems = this.getCartItems();
    const existIndex = cartItems.findIndex(
      item => item.variantId === product.variantId
    );

    if (existIndex > -1) {
      cartItems[existIndex].quantity += quantity;
    } else {
      cartItems.push({
        ...product,
        quantity,
        selected: true,
      });
    }

    this.setCartItems(cartItems);
    return cartItems;
  },

  updateCartItemQuantity(variantId, quantity) {
    const cartItems = this.getCartItems();
    const index = cartItems.findIndex(item => item.variantId === variantId);

    if (index > -1) {
      if (quantity <= 0) {
        cartItems.splice(index, 1);
      } else {
        cartItems[index].quantity = quantity;
      }
      this.setCartItems(cartItems);
    }

    return cartItems;
  },

  removeFromCart(variantId) {
    return this.updateCartItemQuantity(variantId, 0);
  },

  clearCart() {
    this.setCartItems([]);
  },

  getCartTotal() {
    const cartItems = this.getCartItems();
    return cartItems
      .filter(item => item.selected)
      .reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
  },

  getCartCount() {
    const cartItems = this.getCartItems();
    return cartItems.reduce((count, item) => {
      return count + (item.selected ? item.quantity : 0);
    }, 0);
  },
});
