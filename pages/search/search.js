const { searchProducts } = require('../../providers/shop/products/products');
const { debounce } = require('../../utils/util.js');

Page({
  data: {
    searchKeyword: '',
    searchHistory: [],
    hotSearch: [
      { keyword: '不锈钢螺栓', count: 1256 },
      { keyword: '轴承6205', count: 986 },
      { keyword: '电动工具', count: 854 },
      { keyword: '密封圈', count: 765 },
      { keyword: '劳保手套', count: 654 },
      { keyword: '螺丝套装', count: 543 },
    ],
    searchResults: [],
    totalResults: 0,
    currentPage: 0,
    pageSize: 10,
    hasMore: true,
    loading: false,
  },

  onLoad() {
    this.loadSearchHistory();
  },

  loadSearchHistory() {
    const history = wx.getStorageSync('search_history') || [];
    this.setData({
      searchHistory: history,
    });
  },

  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value,
    });

    if (e.detail.value.length > 0) {
      this.debouncedSearch();
    }
  },

  debouncedSearch: debounce(function() {
    this.onSearchConfirm();
  }, 500),

  onSearchConfirm() {
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) return;

    this.saveToHistory(keyword);
    this.setData({
      currentPage: 0,
      searchResults: [],
      hasMore: true,
    });
    this.performSearch(keyword);
  },

  saveToHistory(keyword) {
    let history = this.data.searchHistory;
    history = history.filter(item => item !== keyword);
    history.unshift(keyword);
    history = history.slice(0, 20);
    wx.setStorageSync('search_history', history);
    this.setData({
      searchHistory: history,
    });
  },

  onClearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清除搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('search_history');
          this.setData({
            searchHistory: [],
          });
        }
      },
    });
  },

  onClearSearch() {
    this.setData({
      searchKeyword: '',
      searchResults: [],
      totalResults: 0,
    });
  },

  onCancel() {
    wx.navigateBack();
  },

  onHistoryTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({
      searchKeyword: keyword,
    });
    this.onSearchConfirm();
  },

  async performSearch(keyword) {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const skip = this.data.currentPage * this.data.pageSize;
      const result = await searchProducts(keyword, {
        take: this.data.pageSize,
        skip: skip,
      });

      if (result.items && result.items.length > 0) {
        const products = result.items.map(item => ({
          id: item.productVariantId,
          name: item.productVariantName || item.productName,
          brand: item.productName || '',
          sku: item.sku || '',
          price: (item.priceWithTax / 100).toFixed(2),
          image: item.featuredAsset && item.featuredAsset.preview || 'https://via.placeholder.com/200x200',
          stock: item.stockLevel || '充足',
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
          totalResults: this.data.searchResults.length,
        });
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  loadMore() {
    this.performSearch(this.data.searchKeyword);
  },

  goToProduct(e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/product/product?id=${productId}`,
    });
  },
});
