const { formatDate } = require('../../utils/util.js');

Page({
  data: {
    orderId: '',
    order: {
      id: '',
      code: 'ORD202405170001',
      state: 'pending',
      createdAt: '2024-05-17 10:30:00',
      total: '1,250.00',
      goodsAmount: '1,200.00',
      shippingFee: '50.00',
      discount: '0.00',
      paymentMethod: '在线支付',
      shippingMethod: '快递配送',
      address: {
        receiver: '张三',
        phone: '13812345678',
        detail: '广东省深圳市南山区科技园南路88号',
      },
      products: [
        {
          name: '不锈钢螺栓M10高强度',
          sku: 'SKU-2024-001',
          brand: '优材优品',
          price: '2.50',
          quantity: 200,
          moq: 100,
          image: 'https://via.placeholder.com/200x200',
        },
        {
          name: '轴承6205-2RS',
          sku: 'SKU-2024-002',
          brand: 'SKF',
          price: '18.00',
          quantity: 50,
          moq: 10,
          image: 'https://via.placeholder.com/200x200',
        },
      ],
    },
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        orderId: options.id,
      });
      this.loadOrderDetail(options.id);
    }
  },

  async loadOrderDetail(id) {
    console.log('Loading order detail:', id);
  },

  getStatusText(state) {
    const statusMap = {
      pending: '待审批',
      paid: '待付款',
      shipped: '已发货',
      completed: '已完成',
      cancelled: '已取消',
    };
    return statusMap[state] || state;
  },

  getStatusHint(state) {
    const hintMap = {
      pending: '您的订单已提交，等待审批中',
      paid: '请尽快完成支付',
      shipped: '商品已发货，请注意查收',
      completed: '订单已完成，感谢您的购买',
      cancelled: '订单已取消',
    };
    return hintMap[state] || '';
  },

  onConfirmReceive() {
    wx.showModal({
      title: '确认收货',
      content: '确定已收到商品吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '已确认收货',
            icon: 'success',
          });
        }
      },
    });
  },

  onPayNow() {
    wx.showToast({
      title: '支付功能开发中',
      icon: 'none',
    });
  },

  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话: 400-888-8888\n工作时间: 9:00-18:00',
      showCancel: false,
    });
  },
});
