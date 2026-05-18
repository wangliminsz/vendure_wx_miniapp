Component({
  properties: {
    title: {
      type: String,
      default: '优材工品'
    }
  },
  data: {
    statusBarHeight: 44,
    navBarHeight: 88
  },
  attached() {
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight || 44,
      navBarHeight: (systemInfo.statusBarHeight || 44) + 44
    });
  },
  methods: {
    onDotsTap() {
      wx.showToast({
        title: '更多选项',
        icon: 'none'
      });
    },
    onCircleTap() {
      wx.showToast({
        title: '关闭',
        icon: 'none'
      });
    }
  }
});