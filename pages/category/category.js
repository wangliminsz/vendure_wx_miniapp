const app = getApp();
const config = require('../../config.js');
const { getCollections, getCollection } = require('../../providers/shop/products/products');
const { formatPrice } = require('../../utils/util.js');

Page({
  data: {
    categories: [],
    activeCategory: 0,
    products: [],
    currentPage: 0,
    pageSize: 10,
    hasMore: true,
    loading: false,
    filterType: '',
    showBackToTop: false,
    scrollTop: 0,
  },

  onLoad(options) {
    this.loadCategories();
    if (options.id) {
      const index = this.data.categories.findIndex(c => c.id == options.id);
      if (index > -1) {
        this.setData({ activeCategory: index });
        this.loadSubCategories(options.id);
      }
    }
  },

  onShow() {
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

  async loadCategories() {
    try {
      console.log('========== Loading categories from Vendure ==========');
      const collections = await getCollections();
      console.log('Raw collections from Vendure:', JSON.stringify(collections, null, 2));
      
      if (collections.length === 0) {
        console.log('No collections returned from Vendure, using default categories');
        this.setData({ categories: config.CATEGORIES });
        return;
      }
      
      const parentCollections = collections.filter(c => !c.parent || c.parent.id === '1' || c.parent.name === '__root_collection__');
      console.log('Parent collections:', JSON.stringify(parentCollections, null, 2));
      
      const sortedCategories = [];
      parentCollections.forEach(parent => {
        sortedCategories.push({
          id: parent.id,
          name: parent.name,
          slug: parent.slug,
        });
        
        if (parent.children && parent.children.length > 0) {
          parent.children.forEach(child => {
            sortedCategories.push({
              id: child.id,
              name: child.name,
              slug: child.slug,
            });
          });
        }
      });

      console.log('Sorted categories:', JSON.stringify(sortedCategories, null, 2));
      
      this.setData({
        categories: sortedCategories,
      });

      if (sortedCategories.length > 0 && !this.data.currentSlug) {
        this.setData({ currentSlug: sortedCategories[0].slug });
        this.loadProductsBySlug(sortedCategories[0].slug);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      this.setData({
        categories: config.CATEGORIES,
      });
    }
  },

  loadSubCategories(categoryId) {
    this.setData({
      products: [],
      currentPage: 0,
      hasMore: true,
    });
    this.loadProducts(categoryId);
  },

  async loadProducts(categoryId) {
    if (this.data.loading || !this.data.hasMore) return;

    let slug = this.data.currentSlug;
    if (!slug && categoryId) {
      const category = this.data.categories.find(c => c.id == categoryId);
      if (category) {
        slug = category.slug;
      }
    }

    if (!slug) {
      return;
    }

    this.setData({ loading: true });

    try {
      const page = this.data.currentPage + 1;
      const result = await getCollection(slug, page, this.data.pageSize);

      if (result && result.productVariants && result.productVariants.items.length > 0) {
        const newProducts = result.productVariants.items.map(item => {
          const product = item.product || {};
          const variantImage = item.featuredAsset && item.featuredAsset.preview;
          const productImage = product.featuredAsset && product.featuredAsset.preview;
          
          return {
            id: item.id,
            name: item.name,
            brand: product.name || '',
            sku: item.sku || '',
            price: formatPrice(item.priceWithTax, item.currencyCode).replace('¥', ''),
            volumePrice: (item.priceWithTax * 0.85 / 100).toFixed(2),
            image: variantImage || productImage || 'https://via.placeholder.com/200x200',
            stock: item.stockLevel || '充足',
            moq: '1',
            leadTime: '3-5天',
          };
        });

        const existingIds = this.data.products.map(p => p.id);
        const uniqueProducts = newProducts.filter(p => !existingIds.includes(p.id));

        this.setData({
          products: [...this.data.products, ...uniqueProducts],
          currentPage: page,
          hasMore: uniqueProducts.length >= this.data.pageSize,
        });
      } else {
        this.setData({
          hasMore: false,
        });
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadProductsBySlug(slug) {
    this.setData({
      currentSlug: slug,
      products: [],
      currentPage: 0,
      hasMore: true,
      loading: true,
    });

    const result = await getCollection(slug, 1, this.data.pageSize);
    
    if (result) {
      const categories = this.data.categories;
      const index = categories.findIndex(c => c.slug === slug);
      if (index > -1) {
        this.setData({ activeCategory: index });
      }

      if (result.productVariants && result.productVariants.items && result.productVariants.items.length > 0) {
        const products = result.productVariants.items.map(item => {
          const product = item.product || {};
          const variantImage = item.featuredAsset && item.featuredAsset.preview;
          const productImage = product.featuredAsset && product.featuredAsset.preview;
          
          return {
            id: item.id,
            name: item.name,
            brand: product.name || '',
            sku: item.sku || '',
            price: formatPrice(item.priceWithTax, item.currencyCode).replace('¥', ''),
            volumePrice: (item.priceWithTax * 0.85 / 100).toFixed(2),
            image: variantImage || productImage || 'https://via.placeholder.com/200x200',
            stock: item.stockLevel || '充足',
            moq: '1',
            leadTime: '3-5天',
          };
        });

        this.setData({ 
          products, 
          loading: false,
          hasMore: result.productVariants.items.length >= this.data.pageSize,
          currentPage: 1,
        });
      } else {
        this.setData({ products: [], loading: false, hasMore: false });
      }
    } else {
      this.setData({ loading: false, hasMore: false });
    }
  },

  onCategoryTap(e) {
    const index = e.currentTarget.dataset.index;
    const category = this.data.categories[index];

    if (!category || !category.slug) {
      return;
    }

    this.setData({
      activeCategory: index,
      currentSlug: category.slug,
      products: [],
      currentPage: 0,
      hasMore: true,
      loading: false,
    });

    this.loadProductsBySlug(category.slug);
  },

  toggleFilter(e) {
    const type = e.currentTarget.dataset.type;
    wx.showToast({
      title: `筛选: ${type}`,
      icon: 'none',
    });
  },

  goToProduct(e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product/product?id=${productId}`,
    });
  },

  onAddToCart(e) {
    const productId = e.currentTarget.dataset.id;
    const product = this.data.products.find(p => p.id == productId);

    if (product) {
      app.addToCart({
        variantId: productId,
        name: product.name,
        price: product.price,
        image: product.image,
      });

      wx.showToast({
        title: '已加入采购车',
        icon: 'success',
      });

      this.updateCartBadge();
    }
  },

  loadMore() {
    if (this.data.currentSlug) {
      this.loadProductsBySlugMore(this.data.currentSlug);
    }
  },

  async loadProductsBySlugMore(slug) {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const page = this.data.currentPage + 1;
      const result = await getCollection(slug, page, this.data.pageSize);

      if (result && result.productVariants && result.productVariants.items.length > 0) {
        const newProducts = result.productVariants.items.map(item => {
          const product = item.product || {};
          const variantImage = item.featuredAsset && item.featuredAsset.preview;
          const productImage = product.featuredAsset && product.featuredAsset.preview;
          
          return {
            id: item.id,
            name: item.name,
            brand: product.name || '',
            sku: item.sku || '',
            price: formatPrice(item.priceWithTax, item.currencyCode).replace('¥', ''),
            volumePrice: (item.priceWithTax * 0.85 / 100).toFixed(2),
            image: variantImage || productImage || 'https://via.placeholder.com/200x200',
            stock: item.stockLevel || '充足',
            moq: '1',
            leadTime: '3-5天',
          };
        });

        const existingIds = this.data.products.map(p => p.id);
        const uniqueProducts = newProducts.filter(p => !existingIds.includes(p.id));

        this.setData({
          products: [...this.data.products, ...uniqueProducts],
          currentPage: page,
          hasMore: uniqueProducts.length >= this.data.pageSize,
        });
      } else {
        this.setData({ hasMore: false });
      }
    } catch (error) {
      console.error('Failed to load more products:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    } else if (!this.data.hasMore) {
      wx.showToast({
        title: '已经到底了...',
        icon: 'none',
      });
    }
  },

  onScroll(e) {
    if (e.detail.scrollTop > 500) {
      this.setData({ showBackToTop: true });
    } else {
      this.setData({ showBackToTop: false });
    }
  },

  scrollToTop() {
    this.setData({ scrollTop: 0 });
  },

  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/search',
    });
  },
});
