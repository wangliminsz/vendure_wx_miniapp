const app = getApp();

Page({
  data: {
    cartItems: [],
    selectAll: false,
    totalPrice: '0.00',
    selectedCount: 0,
  },

  onShow() {
    this.loadCartItems();
  },

  loadCartItems() {
    const cartItems = app.getCartItems();
    const selectedItems = cartItems.filter(item => item.selected);
    const totalPrice = this.calculateTotal(cartItems);

    this.setData({
      cartItems,
      selectedCount: selectedItems.length,
      totalPrice: totalPrice.toFixed(2),
    });
  },

  calculateTotal(items) {
    return items
      .filter(item => item.selected)
      .reduce((total, item) => {
        return total + (parseFloat(item.price) * item.quantity);
      }, 0);
  },

  onItemSelect(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = this.data.cartItems;
    cartItems[index].selected = !cartItems[index].selected;

    const selectedItems = cartItems.filter(item => item.selected);
    const totalPrice = this.calculateTotal(cartItems);

    this.setData({
      cartItems,
      selectedCount: selectedItems.length,
      totalPrice: totalPrice.toFixed(2),
      selectAll: selectedItems.length === cartItems.length,
    });

    app.setCartItems(cartItems);
    this.updateCartBadge();
  },

  onSelectAll() {
    const selectAll = !this.data.selectAll;
    const cartItems = this.data.cartItems.map(item => ({
      ...item,
      selected: selectAll,
    }));

    const totalPrice = this.calculateTotal(cartItems);

    this.setData({
      cartItems,
      selectAll,
      selectedCount: selectAll ? cartItems.length : 0,
      totalPrice: totalPrice.toFixed(2),
    });

    app.setCartItems(cartItems);
    this.updateCartBadge();
  },

  onMinus(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = this.data.cartItems;

    if (cartItems[index].quantity > 1) {
      cartItems[index].quantity -= 1;
      this.updateCart(cartItems);
    }
  },

  onPlus(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = this.data.cartItems;
    cartItems[index].quantity += 1;
    this.updateCart(cartItems);
  },

  onQuantityChange(e) {
    const index = e.currentTarget.dataset.index;
    const quantity = parseInt(e.detail.value) || 1;
    const cartItems = this.data.cartItems;

    if (quantity > 0) {
      cartItems[index].quantity = quantity;
      this.updateCart(cartItems);
    }
  },

  onDelete(e) {
    const index = e.currentTarget.dataset.index;
    const cartItems = this.data.cartItems;

    wx.showModal({
      title: '提示',
      content: '确定要删除该商品吗？',
      success: (res) => {
        if (res.confirm) {
          cartItems.splice(index, 1);
          this.updateCart(cartItems);
        }
      },
    });
  },

  updateCart(cartItems) {
    const totalPrice = this.calculateTotal(cartItems);
    const selectedItems = cartItems.filter(item => item.selected);

    this.setData({
      cartItems,
      selectedCount: selectedItems.length,
      totalPrice: totalPrice.toFixed(2),
    });

    app.setCartItems(cartItems);
    this.updateCartBadge();
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

  onCheckout() {
    if (this.data.selectedCount === 0) {
      wx.showToast({
        title: '请选择商品',
        icon: 'none',
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
