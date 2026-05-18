const app = getApp();
const { getCustomerOrders } = require('../../providers/shop/orders/order');
const { formatDate } = require('../../utils/util.js');

Page({
  data: {
    activeStatus: 'all',
    orders: [],
    currentPage: 0,
    pageSize: 10,
    hasMore: true,
    loading: false,
  },

  onLoad(options) {
    if (options.status) {
      this.setData({
        activeStatus: options.status,
      });
    }
    this.loadOrders();
  },

  onShow() {
    if (app.globalData.orderRefresh) {
      this.setData({
        currentPage: 0,
        orders: [],
        hasMore: true,
      });
      this.loadOrders();
      app.globalData.orderRefresh = false;
    }
  },

  async loadOrders() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const skip = this.data.currentPage * this.data.pageSize;
      const options = {
        skip,
        take: this.data.pageSize,
      };

      if (this.data.activeStatus !== 'all') {
        options.filter = {
          state: {
            eq: this.data.activeStatus,
          },
        };
      }

      const result = await getCustomerOrders(options);

      if (result.items && result.items.length > 0) {
        const orders = result.items.map(order => ({
          id: order.id,
          code: order.code,
          state: order.state,
          total: (order.totalWithTax / 100).toFixed(2),
          createdAt: formatDate(order.createdAt),
          products: order.lines.slice(0, 2).map(line => ({
            name: line.productVariant && line.productVariant.name || '商品',
            sku: line.productVariant && line.productVariant.sku || '',
            price: (line.unitPriceWithTax / 100).toFixed(2),
            quantity: line.quantity,
            image: line.productVariant && line.productVariant.featuredAsset && line.productVariant.featuredAsset.preview || 'https://via.placeholder.com/100x100',
          })),
        }));

        this.setData({
          orders: [...this.data.orders, ...orders],
          currentPage: this.data.currentPage + 1,
          hasMore: result.items.length >= this.data.pageSize,
        });
      } else {
        this.setData({
          hasMore: false,
        });
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  onStatusChange(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({
      activeStatus: status,
      currentPage: 0,
      orders: [],
      hasMore: true,
    });
    this.loadOrders();
  },

  getStatusText(state) {
    const statusMap = {
      pending: '待审批',
      paid: '待付款',
      shipped: '待发货',
      completed: '已完成',
      cancelled: '已取消',
    };
    return statusMap[state] || state;
  },

  goToDetail(e) {
    const orderId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/orderDetail/orderDetail?id=${orderId}`,
    });
  },

  onRemindShip(e) {
    wx.showToast({
      title: '已提醒商家发货',
      icon: 'success',
    });
  },

  onBuyAgain(e) {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
    });
  },

  loadMore() {
    this.loadOrders();
  },

  goShopping() {
    wx.switchTab({
      url: '/pages/home/home',
    });
  },
});
