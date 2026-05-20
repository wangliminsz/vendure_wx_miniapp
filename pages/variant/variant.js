const app = getApp();
const { graphqlClient } = require('../../utils/api.js');

Page({
  data: {
    productSlug: '',
    variantId: '',
    variant: null,
    product: null,
    loading: true,
    error: null,
    currentImageIndex: 0,
    images: [],
    quantity: 1,
    addToCartError: null,
    isAddingToCart: false,
    isLogin: false,
  },

  onLoad(options) {
    console.log('variant onLoad options:', options);
    
    this.setData({
      productSlug: options.productSlug || '',
      variantId: options.variantId || options.id || '',
    });
    
    if (!this.data.variantId) {
      this.setData({
        error: '缺少商品参数',
        loading: false,
      });
      return;
    }
    
    this.initPage();
  },

  async initPage() {
    await app.loginPromise;
    this.setData({ isLogin: app.globalData.isLogin });
    this.fetchVariant();
  },

  async fetchVariant() {
    try {
      this.setData({ loading: true, error: null });

      const query = `
        query GetProductWithVariants($slug: String!) {
          product(slug: $slug) {
            id
            name
            slug
            description
            collections {
              id
              slug
              name
            }
            featuredAsset {
              id
              preview
            }
            assets {
              id
              preview
            }
            variants {
              id
              name
              sku
              priceWithTax
              currencyCode
              stockLevel
              featuredAsset {
                id
                preview
              }
              assets {
                id
                preview
              }
              options {
                id
                name
                code
              }
            }
          }
        }
      `;

      const data = await graphqlClient.query(query, { slug: this.data.productSlug });
      
      console.log('fetchVariant data:', data);

      const product = data?.product;

      if (!product) {
        this.setData({
          error: '商品不存在',
          loading: false,
        });
        return;
      }

      console.log('variants:', product.variants);
      console.log('looking for variantId:', this.data.variantId);

      const foundVariant = product.variants.find(v => String(v.id) === String(this.data.variantId));
      console.log('foundVariant:', foundVariant);

      if (!foundVariant) {
        this.setData({
          error: '商品规格不存在',
          loading: false,
        });
        return;
      }

      console.log('🔍 Debug - variant featuredAsset:', foundVariant.featuredAsset);
      console.log('🔍 Debug - variant assets:', foundVariant.assets);
      console.log('🔍 Debug - product featuredAsset:', product.featuredAsset);
      console.log('🔍 Debug - product assets:', product.assets);

      const images = this.buildImagesArray(foundVariant, product);
      console.log('🔍 Built images array:', images);

      this.setVariantData(foundVariant, product, images);

    } catch (err) {
      console.error('加载商品失败:', err);
      this.setData({
        error: '加载商品失败，请重试: ' + err.message,
        loading: false,
      });
    }
  },

  buildImagesArray(variant, product) {
    const variantFeaturedAsset = variant.featuredAsset;
    const variantAssets = variant.assets || [];
    const productAssets = product?.assets || [];
    const productFeaturedAsset = product?.featuredAsset;

    let allImages = [];

    if (variantAssets.length > 0) {
      allImages = [...variantAssets];
      if (variantFeaturedAsset && !variantAssets.some(asset => asset.id === variantFeaturedAsset.id)) {
        allImages = [variantFeaturedAsset, ...allImages];
      }
    } else if (variantFeaturedAsset) {
      allImages = [variantFeaturedAsset];
    }

    if (allImages.length > 0) {
      productAssets.forEach(productAsset => {
        if (!allImages.some(variantAsset => variantAsset.id === productAsset.id)) {
          allImages.push(productAsset);
        }
      });
      if (productFeaturedAsset && !allImages.some(asset => asset.id === productFeaturedAsset.id)) {
        allImages.push(productFeaturedAsset);
      }
      return allImages;
    }

    if (productAssets.length > 0) {
      return productAssets;
    } else if (productFeaturedAsset) {
      return [productFeaturedAsset];
    }

    return [];
  },

  setVariantData(variant, product, images) {
    const variantData = { ...variant, product };

    this.setData({
      variant: variantData,
      product: product,
      images: images,
      loading: false,
      quantity: 1,
    });

    wx.setNavigationBarTitle({
      title: variant.name || '商品详情',
    });
  },

  onPreviousImage() {
    const images = this.data.images;
    if (images.length <= 1) return;

    let newIndex = this.data.currentImageIndex - 1;
    if (newIndex < 0) {
      newIndex = images.length - 1;
    }
    this.setData({ currentImageIndex: newIndex });
  },

  onNextImage() {
    const images = this.data.images;
    if (images.length <= 1) return;

    let newIndex = this.data.currentImageIndex + 1;
    if (newIndex >= images.length) {
      newIndex = 0;
    }
    this.setData({ currentImageIndex: newIndex });
  },

  onImageTap(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentImageIndex: index });
  },

  onMinus() {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 });
    }
  },

  onPlus() {
    const stockLevel = this.data.variant?.stockLevel;
    if (typeof stockLevel === 'number' && this.data.quantity >= stockLevel) {
      wx.showToast({
        title: '库存不足',
        icon: 'none',
      });
      return;
    }
    this.setData({ quantity: this.data.quantity + 1 });
  },

  onQuantityChange(e) {
    const quantity = parseInt(e.detail.value) || 1;
    if (quantity > 0) {
      this.setData({ quantity });
    }
  },

  getStockLevelText(stockLevel) {
    if (typeof stockLevel === 'number') {
      if (stockLevel > 10) return '有货';
      if (stockLevel > 0) return `剩余 ${stockLevel} 件`;
      return '缺货';
    } else if (typeof stockLevel === 'string') {
      if (stockLevel === 'IN_STOCK') return '有货';
      if (stockLevel === 'OUT_OF_STOCK') return '缺货';
      if (stockLevel === 'LOW_STOCK') return '库存紧张';
      return stockLevel;
    }
    return '有货';
  },

  getStockLevelClass(stockLevel) {
    if (typeof stockLevel === 'number') {
      if (stockLevel > 10) return 'stock-in';
      if (stockLevel > 0) return 'stock-low';
      return 'stock-out';
    } else if (typeof stockLevel === 'string') {
      if (stockLevel === 'IN_STOCK') return 'stock-in';
      if (stockLevel === 'OUT_OF_STOCK') return 'stock-out';
      if (stockLevel === 'LOW_STOCK') return 'stock-low';
    }
    return 'stock-in';
  },

  getHumanFriendlyErrorMessage(errorCode) {
    const errorMessages = {
      'INSUFFICIENT_STOCK_ERROR': '该商品库存不足，无法加入采购车',
      'ORDER_LIMIT_ERROR': '已达到该商品的最大购买数量',
      'NEGATIVE_QUANTITY_ERROR': '数量无效',
      'INSUFFICIENT_STOCK': '抱歉，该商品requested数量暂无货',
    };
    return errorMessages[errorCode] || '加入采购车失败，请重试';
  },

  closeError() {
    this.setData({ addToCartError: null });
  },

  async addToCart() {
    if (!this.data.variant) return;

    const stockLevel = this.data.variant.stockLevel;
    if (typeof stockLevel === 'number' && stockLevel <= 0) {
      wx.showToast({
        title: '该商品已缺货',
        icon: 'none',
      });
      return;
    }

    this.setData({ addToCartError: null, isAddingToCart: true });

    try {
      if (app.globalData.isLogin) {
        await this.addToServerCart();
      } else {
        this.addToLocalCart();
      }
    } catch (error) {
      console.error('加入采购车失败:', error);
      this.setData({ addToCartError: '加入采购车失败，请重试' });
    } finally {
      this.setData({ isAddingToCart: false });
    }
  },

  async addToServerCart() {
    const token = wx.getStorageSync('vendure-auth-token');

    const query = `
      query GetActiveOrder {
        activeOrder {
          id
          state
          lines {
            id
            productVariant {
              id
            }
            quantity
          }
        }
      }
    `;

    try {
      const checkData = await graphqlClient.query(query, {}, token);
      const activeOrder = checkData?.activeOrder;

      if (activeOrder && activeOrder.state !== 'AddingItems') {
        if (activeOrder.state === 'ArrangingPayment') {
          this.setData({ addToCartError: '您有待付款订单，请先完成或取消' });
          return;
        }
        if (activeOrder.state === 'PaymentAuthorized') {
          this.setData({ addToCartError: '该订单已授权，请创建新的采购车' });
          return;
        }
        this.setData({ addToCartError: `订单状态：${activeOrder.state}，无法添加商品` });
        return;
      }

      const mutation = `
        mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
          addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
            __typename
            ... on Order {
              id
            }
            ... on OrderLimitError {
              errorCode
              message
            }
            ... on InsufficientStockError {
              errorCode
              message
            }
          }
        }
      `;

      const result = await graphqlClient.mutate(mutation, {
        productVariantId: this.data.variant.id,
        quantity: this.data.quantity,
      }, token);

      const addResult = result?.addItemToOrder;

      if (addResult?.__typename === 'OrderLimitError' || addResult?.__typename === 'InsufficientStockError') {
        this.setData({ addToCartError: this.getHumanFriendlyErrorMessage(addResult.errorCode) });
      } else {
        wx.showToast({
          title: '已加入采购车',
          icon: 'success',
        });
        await app.syncServerCartCount();
      }
    } catch (error) {
      console.error('加入采购车失败:', error);
      this.setData({ addToCartError: error.message || '加入采购车失败，请重试' });
    }
  },

  addToLocalCart() {
    const variant = this.data.variant;
    const images = this.data.images;

    const product = {
      variantId: variant.id,
      name: variant.name,
      price: variant.priceWithTax / 100,
      image: images[0]?.preview || '',
      sku: variant.sku || '',
      stock: variant.stockLevel,
    };

    app.addToCart(product, this.data.quantity);

    app.globalData.cartTotalCount = app.getCartCount();

    wx.showToast({
      title: '已加入采购车',
      icon: 'success',
    });

    app.updateCartBadge();
  },

  updateCartBadge() {
    app.updateCartBadge();
  },

  goBack() {
    wx.navigateBack();
  },

  goHome() {
    wx.switchTab({
      url: '/pages/home/home',
    });
  },

  goToCart() {
    wx.switchTab({
      url: '/pages/cart/cart',
    });
  },
});