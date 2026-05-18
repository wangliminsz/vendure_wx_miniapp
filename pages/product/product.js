const app = getApp();
const { getProduct } = require('../../providers/shop/products/products');
const { formatPrice } = require('../../utils/util.js');

Page({
  data: {
    productId: '',
    product: {
      id: '',
      name: '不锈钢螺栓M10高强度',
      price: '2.50',
      volumePrice: '2.10',
      b2bPrice: '1.80',
      sku: 'SKU-2024-001',
      model: 'GB/T5783-M10-50',
      brand: '优材优品',
      moq: 100,
      leadTime: '3-5天',
      stock: 5000,
      inStock: true,
      stockLevel: 5000,
      images: [
        'https://via.placeholder.com/750x750/165DFF/ffffff?text=Product+Image+1',
        'https://via.placeholder.com/750x750/FF7D00/ffffff?text=Product+Image+2',
        'https://via.placeholder.com/750x750/00B42A/ffffff?text=Product+Image+3',
      ],
      specs: [
        { label: '材质', value: '不锈钢304' },
        { label: '规格', value: 'M10×50' },
        { label: '强度等级', value: '8.8级' },
        { label: '表面处理', value: '本色' },
        { label: '适用场景', value: '机械制造、工程建设' },
      ],
      description: '<p>高强度不锈钢螺栓，适用于各种机械制造和工程建设场景。优质材料，耐腐蚀，使用寿命长。</p>',
    },
    quantity: 100,
    isFavorite: false,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        productId: options.id,
      });
      this.loadProduct(options.id);
    }

    this.setData({
      quantity: this.data.product.moq || 100,
    });
  },

  async loadProduct(id) {
    try {
      wx.showLoading({ title: '加载中...' });

      const product = await getProduct(id);

      if (product) {
        this.setData({
          product: {
            ...this.data.product,
            id: product.id,
            name: product.name,
            price: formatPrice(product.priceWithTax, product.currencyCode).replace('¥', ''),
            sku: product.sku || '',
            images: product.assets && product.assets.length > 0
              ? product.assets.map(a => a.preview)
              : [product.featuredAsset && product.featuredAsset.preview || 'https://via.placeholder.com/750x750'],
          },
        });
      }
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      wx.hideLoading();
    }
  },

  onMinus() {
    if (this.data.quantity > this.data.product.moq) {
      this.setData({
        quantity: this.data.quantity - this.data.product.moq,
      });
    } else {
      wx.showToast({
        title: `起订量${this.data.product.moq}件`,
        icon: 'none',
      });
    }
  },

  onPlus() {
    this.setData({
      quantity: this.data.quantity + this.data.product.moq,
    });
  },

  onQuantityChange(e) {
    const quantity = parseInt(e.detail.value) || this.data.product.moq;
    if (quantity < this.data.product.moq) {
      wx.showToast({
        title: `起订量${this.data.product.moq}件`,
        icon: 'none',
      });
      this.setData({
        quantity: this.data.product.moq,
      });
    } else {
      this.setData({
        quantity,
      });
    }
  },

  toggleFavorite() {
    this.setData({
      isFavorite: !this.data.isFavorite,
    });

    wx.showToast({
      title: this.data.isFavorite ? '已收藏' : '已取消收藏',
      icon: 'success',
    });
  },

  onAddToCart() {
    const product = this.data.product;

    app.addToCart({
      variantId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      sku: product.sku,
      moq: product.moq,
      stock: product.stock,
    });

    wx.showToast({
      title: '已加入采购车',
      icon: 'success',
    });

    const cartCount = app.getCartCount();
    if (cartCount > 0) {
      wx.setTabBarBadge({
        index: 2,
        text: String(cartCount),
      });
    }
  },

  onBuyNow() {
    this.onAddToCart();

    setTimeout(() => {
      wx.switchTab({
        url: '/pages/cart/cart',
      });
    }, 1500);
  },

  goToHome() {
    wx.switchTab({
      url: '/pages/home/home',
    });
  },
});
