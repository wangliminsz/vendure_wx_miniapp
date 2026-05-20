const app = getApp();
const { graphqlClient } = require('../../utils/api.js');

Page({
  data: {
    cartItems: [],
    totalPrice: '0.00',
    totalCount: 0,
    isLogin: false,
    isLoading: false,
    syncStatus: '',
  },

  onLoad() {
    this.initCart();
  },

  onShow() {
    this.loadCart();
  },

  async initCart() {
    await app.loginPromise;
    this.setData({ isLogin: app.globalData.isLogin });
    this.loadCart();
  },

  loadCart() {
    if (app.globalData.isLogin) {
      this.loadServerCart();
    } else {
      const cartItems = app.getCartItems();
      this.updateCartDisplay(cartItems);
    }
  },

  async loadServerCart() {
    this.setData({ isLoading: true });
    
    try {
      const query = `
        query GetActiveOrder {
          activeOrder {
            id
            code
            state
            totalQuantity
            subTotalWithTax
            lines {
              id
              unitPriceWithTax
              linePriceWithTax
              quantity
              featuredAsset {
                id
                preview
              }
              productVariant {
                id
                name
                sku
                price
                stockLevel
                featuredAsset {
                  preview
                }
              }
            }
          }
        }
      `;

      const data = await graphqlClient.query(query);
      console.log('loadServerCart data:', data);

      if (data?.activeOrder) {
        const serverCart = data.activeOrder;
        const cartItems = serverCart.lines.map(line => ({
          id: line.id,
          variantId: line.productVariant.id,
          name: line.productVariant.name,
          sku: line.productVariant.sku,
          price: (line.linePriceWithTax / line.quantity / 100).toFixed(2),
          originalPrice: (line.linePriceWithTax / line.quantity / 100).toFixed(2),
          quantity: line.quantity,
          image: line.featuredAsset?.preview || line.productVariant.featuredAsset?.preview || '',
          stock: line.productVariant.stockLevel,
        }));
        this.updateCartDisplay(cartItems);
        
        await this.syncLocalCartToServer(cartItems);
      } else {
        this.checkLocalCartAndSync();
      }
    } catch (error) {
      console.error('加载服务器购物车失败:', error);
      this.checkLocalCartAndSync();
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async syncLocalCartToServer(serverItems) {
    const localItems = wx.getStorageSync('cart_items') || [];
    if (localItems.length === 0) return;

    this.setData({ syncStatus: '正在同步本地商品...' });

    for (const localItem of localItems) {
      const existsInServer = serverItems.some(item => item.variantId === localItem.variantId);
      if (!existsInServer) {
        await this.addToServerCart(localItem.variantId, localItem.quantity);
      }
    }

    wx.removeStorageSync('cart_items');
    this.setData({ syncStatus: '' });
  },

  async checkLocalCartAndSync() {
    const localItems = wx.getStorageSync('cart_items') || [];
    if (localItems.length > 0 && app.globalData.isLogin) {
      this.setData({ syncStatus: '正在同步购物车...' });
      
      for (const item of localItems) {
        await this.addToServerCart(item.variantId, item.quantity);
      }
      
      wx.removeStorageSync('cart_items');
      this.setData({ syncStatus: '' });
      this.loadServerCart();
    } else {
      const cartItems = app.getCartItems();
      this.updateCartDisplay(cartItems);
    }
  },

  async addToServerCart(variantId, quantity) {
    try {
      const mutation = `
        mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
          addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
            __typename
            ... on Order {
              id
            }
            ... on ErrorResult {
              errorCode
              message
            }
          }
        }
      `;

      const result = await graphqlClient.mutate(mutation, { productVariantId: variantId, quantity });
      return result?.addItemToOrder;
    } catch (error) {
      console.error('添加商品到服务器购物车失败:', error);
    }
  },

  updateCartDisplay(cartItems) {
    const totalPrice = this.calculateTotal(cartItems);
    const totalCount = this.calculateTotalCount(cartItems);

    this.setData({
      cartItems,
      totalPrice: totalPrice.toFixed(2),
      totalCount: totalCount,
    });

    app.globalData.cartTotalCount = totalCount;
    this.updateCartBadge();
  },

  calculateTotal(items) {
    return items.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity);
    }, 0);
  },

  calculateTotalCount(items) {
    return items.reduce((count, item) => {
      return count + item.quantity;
    }, 0);
  },

  async onMinus(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = [...this.data.cartItems];

    if (cartItems[index].quantity > 1) {
      cartItems[index].quantity -= 1;
      await this.updateCart(cartItems);
    }
  },

  async onPlus(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = [...this.data.cartItems];
    
    const item = cartItems[index];
    if (item.stock !== undefined && typeof item.stock === 'number' && item.quantity >= item.stock) {
      wx.showToast({
        title: '库存不足',
        icon: 'none',
      });
      return;
    }
    
    cartItems[index].quantity += 1;
    await this.updateCart(cartItems);
  },

  async onQuantityChange(e) {
    const index = e.currentTarget.dataset.index;
    const quantity = parseInt(e.detail.value) || 1;
    const cartItems = [...this.data.cartItems];

    if (quantity > 0) {
      cartItems[index].quantity = quantity;
      await this.updateCart(cartItems);
    }
  },

  async onDelete(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = [...this.data.cartItems];
    const itemToDelete = cartItems[index];

    wx.showModal({
      title: '提示',
      content: '确定要删除该商品吗？',
      success: async (res) => {
        if (res.confirm) {
          cartItems.splice(index, 1);
          await this.updateCart(cartItems, true, itemToDelete);
        }
      },
    });
  },

  async updateCart(cartItems, isDelete = false, deletedItem = null) {
    if (app.globalData.isLogin && cartItems.length > 0) {
      this.setData({ isLoading: true });
      
      try {
        if (isDelete && deletedItem) {
          await this.removeFromServerCart(deletedItem.id);
        } else {
          for (const item of cartItems) {
            await this.adjustServerCartQuantity(item.id, item.quantity);
          }
        }
        await this.loadServerCart();
      } catch (error) {
        console.error('更新服务器购物车失败:', error);
        this.updateCartDisplay(cartItems);
      } finally {
        this.setData({ isLoading: false });
      }
    } else {
      this.updateCartDisplay(cartItems);
      app.setCartItems(cartItems);
    }
  },

  async removeFromServerCart(lineId) {
    try {
      const mutation = `
        mutation RemoveOrderLine($orderLineId: ID!) {
          removeOrderLine(orderLineId: $orderLineId) {
            __typename
            ... on Order {
              id
            }
          }
        }
      `;

      await graphqlClient.mutate(mutation, { orderLineId: lineId });
    } catch (error) {
      console.error('删除商品失败:', error);
    }
  },

  async adjustServerCartQuantity(lineId, quantity) {
    if (quantity <= 0) return;

    try {
      const mutation = `
        mutation AdjustOrderLine($orderLineId: ID!, $quantity: Int!) {
          adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
            __typename
            ... on Order {
              id
            }
            ... on ErrorResult {
              errorCode
              message
            }
          }
        }
      `;

      const result = await graphqlClient.mutate(mutation, { orderLineId: lineId, quantity });

      if (result?.adjustOrderLine?.__typename === 'ErrorResult') {
        wx.showToast({
          title: result.adjustOrderLine.message || '调整失败',
          icon: 'none',
        });
      }
    } catch (error) {
      console.error('调整数量失败:', error);
    }
  },

  updateCartBadge() {
    app.updateCartBadge();
  },

  onCheckout() {
    if (this.data.totalCount === 0) {
      wx.showToast({
        title: '购物车是空的',
        icon: 'none',
      });
      return;
    }

    if (!app.globalData.isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/mine/mine',
            });
          }
        },
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/checkout/checkout',
    });
  },

  goShopping() {
    wx.switchTab({
      url: '/pages/home/home',
    });
  },
});