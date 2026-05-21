const { searchProducts } = require('../../providers/shop/products/products');
const { debounce } = require('../../utils/util.js');
const config = require('../../config.js');

Page({
  data: {
    searchKeyword: '',
    showSearchResults: false,
    isSearchInitiated: false, // 新增：搜索是否已完成
    searchHistory: [],
    hotSearch: config.hotSearch,
    searchResults: [],
    totalResults: 0,
    currentPage: 0,
    pageSize: 10,
    hasMore: true,
    loading: false,
    showBackToTop: false,
    scrollTop: 0,
  },

  onLoad() {
    console.log('========== Search Page Loaded ==========');
    this.loadSearchHistory();
  },

  loadSearchHistory() {
    const history = wx.getStorageSync('search_history') || [];
    this.setData({
      searchHistory: history,
    });
  },

  saveToHistory(keyword) {
    let history = this.data.searchHistory;
    history = history.filter(item => item !== keyword);
    history.unshift(keyword);
    history = history.slice(0, 20);
    this.setData({ searchHistory: history });
    wx.setStorageSync('search_history', history);
  },

  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value,
    });
  },

  onSearchConfirm() {
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) return;

    console.log('========== Search Confirm ==========');
    console.log('Keyword:', keyword);

    this.saveToHistory(keyword);
    this.setData({
      currentPage: 0,
      searchResults: [],
      hasMore: true,
      showSearchResults: true,
      showBackToTop: false,
      scrollTop: 0,
      isSearchInitiated: false, // 重置标志
      totalResults: 0,
    });
    this.performSearch(keyword);
  },

  onClearSearch() {
    this.setData({
      searchKeyword: '',
      searchResults: [],
      totalResults: 0,
      currentPage: 0,
      hasMore: true,
      showSearchResults: false,
      showBackToTop: false,
      scrollTop: 0,
      isSearchInitiated: false, // 重置标志
    });
  },

  onCancel() {
    this.onClearSearch();
  },

  onHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      searchKeyword: keyword,
    });
    this.onSearchConfirm();
  },

  onClearHistory() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ searchHistory: [] });
          wx.removeStorageSync('search_history');
        }
      },
    });
  },

  async performSearch(keyword) {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const result = await searchProducts(keyword, {
        page: this.data.currentPage + 1,
        pageSize: this.data.pageSize,
      });

      this.setData({ isSearchInitiated: true });

      if (result.items && result.items.length > 0) {
        const products = result.items.map(item => ({
          variantId: item.variantId,
          productId: item.productId,
          name: item.variantName,
          productName: item.productName,
          productSlug: item.slug || '',
          sku: item.sku || '',
          price: ((item.priceWithTax || 0)).toFixed(2),
          image: (item.productAsset && item.productAsset.preview) ? config.baseUrl.replace('/shop-api', '') + '/assets/' + item.productAsset.preview : 'https://via.placeholder.com/200x200',
          options: item.options || [],
        }));

        this.setData({
          searchResults: [...this.data.searchResults, ...products],
          totalResults: result.totalItems,
          currentPage: this.data.currentPage + 1,
          hasMore: result.items.length >= this.data.pageSize,
        });
      } else {
        this.setData({
          hasMore: false,
          totalResults: 0,
        });
      }
    } catch (error) {
      console.error('Search failed:', error);
      this.setData({
        isSearchInitiated: true,
        totalResults: 0,
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  loadMore() {
    this.performSearch(this.data.searchKeyword);
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
    const currentScrollTop = e.detail.scrollTop;

    if (currentScrollTop > 500 && !this.data.showBackToTop) {
      this.setData({ showBackToTop: true });
    } else if (currentScrollTop <= 500 && this.data.showBackToTop) {
      this.setData({ showBackToTop: false });
    }
  },

  scrollToTop() {
    this.setData({ scrollTop: 1 }, () => {
      this.setData({ scrollTop: 0 });
    });
  },

  goToProduct(e) {
    const variantId = e.currentTarget.dataset.id;
    const productSlug = e.currentTarget.dataset.slug;
    
    wx.navigateTo({
      url: `/pages/variant/variant?productSlug=${productSlug}&variantId=${variantId}`,
    });
  },

  onAddToCart(e) {
    const item = e.currentTarget.dataset.item;
    const app = getApp();
    
    if (app.globalData.isLogin) {
      app.addItemToServerCart(item.variantId, 1).then(() => {
        app.syncServerCartCount();
        wx.showToast({
          title: '已加入采购车',
          icon: 'success',
        });
      }).catch(err => {
        wx.showToast({
          title: '加入失败',
          icon: 'none',
        });
      });
    } else {
      app.addItemToLocalCart({
        variantId: item.variantId,
        name: item.variantName,
        price: item.priceWithTax,
        image: item.image,
      }, 1);
      app.updateCartBadge();
      wx.showToast({
        title: '已加入采购车',
        icon: 'success',
      });
    }
  },
});
