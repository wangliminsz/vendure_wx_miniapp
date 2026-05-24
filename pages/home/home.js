const app = getApp();
const config = require('../../config.js');
const { getCollections } = require('../../providers/shop/products/products');

Page({
  data: {
    banners: [
      {
        image: 'https://bkkschool-1304214433.cos.ap-guangzhou.myqcloud.com/1761471765660-618-15.jpg',
        title: '优涂工品',
        subtitle: '工业耗材B2B批量采购平台',
      },
      {
        image: 'https://bkkschool-1304214433.cos.ap-guangzhou.myqcloud.com/1761471828632-72-1.jpg',
        title: '正品保障',
        subtitle: '品牌授权 品质保证',
      },
      {
        image: 'https://bkkschool-1304214433.cos.ap-guangzhou.myqcloud.com/1769908625640-373-road26.jpg',
        title: '批量优惠',
        subtitle: '量大价优 采购无忧',
      },
    ],
    bannerInterval: config.BANNER_INTERVAL || 4000,

    collections: [],
    collectionsLoading: true,
  },

  async onLoad() {
    // 等待应用全局初始化完成 (确保渠道 token 已获取)
    await app.initPromise;
    this.loadCollections();
  },

  onShow() {
    app.updateCartBadge();
    if (app.globalData.isLogin) {
      app.syncServerCartCount();
    }
  },

  onPullDownRefresh() {
    this.setData({
      collections: [],
      collectionsLoading: true,
    });
    this.loadCollections();
    wx.stopPullDownRefresh();
  },

  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/search',
    });
  },

  onCollectionTap(e) {
    const slug = e.currentTarget.dataset.slug;
    if (slug) {
      wx.switchTab({
        url: '/pages/category/category',
        success: () => {
          const pages = getCurrentPages();
          const categoryPage = pages[pages.length - 1];
          if (categoryPage && categoryPage.loadProductsBySlug) {
            categoryPage.loadProductsBySlug(slug);
          }
        }
      });
    }
  },

  async loadCollections() {
    this.setData({ collectionsLoading: true });

    try {
      const result = await getCollections();
      
      if (result && result.length > 0) {
        const parentCollections = result.filter(c => !c.parent || c.parent.id === '1' || c.parent.name === '__root_collection__');
        
        const sortedCollections = [];
        parentCollections.forEach(parent => {
          if (parent.featuredAsset) {
            sortedCollections.push({
              id: parent.id,
              name: parent.name,
              slug: parent.slug,
              image: parent.featuredAsset && parent.featuredAsset.preview || '',
              count: parent.productCount || 0,
            });
          }
          
          if (parent.children && parent.children.length > 0) {
            parent.children.forEach(child => {
              if (child.featuredAsset) {
                sortedCollections.push({
                  id: child.id,
                  name: child.name,
                  slug: child.slug,
                  image: child.featuredAsset && child.featuredAsset.preview || '',
                  count: child.productCount || 0,
                });
              }
            });
          }
        });
        
        this.setData({ collections: sortedCollections });
      } else {
        const mockCollections = [
          { id: 1, name: '紧固件', slug: 'fasteners', image: 'https://via.placeholder.com/300x300/165DFF/ffffff?text=紧固件', count: 128 },
          { id: 2, name: '轴承', slug: 'bearings', image: 'https://via.placeholder.com/300x300/FF7D00/ffffff?text=轴承', count: 86 },
          { id: 3, name: '五金工具', slug: 'tools', image: 'https://via.placeholder.com/300x300/00B42A/ffffff?text=五金工具', count: 156 },
          { id: 4, name: '电气元件', slug: 'electronics', image: 'https://via.placeholder.com/300x300/722ED1/ffffff?text=电气元件', count: 98 },
          { id: 5, name: '劳保用品', slug: 'safety', image: 'https://via.placeholder.com/300x300/13C2C2/ffffff?text=劳保用品', count: 67 },
          { id: 6, name: '液压气动', slug: 'hydraulic', image: 'https://via.placeholder.com/300x300/EB2F96/ffffff?text=液压气动', count: 78 },
        ];
        this.setData({ collections: mockCollections });
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
      const mockCollections = [
        { id: 1, name: '紧固件', slug: 'fasteners', image: 'https://via.placeholder.com/300x300/165DFF/ffffff?text=紧固件', count: 128 },
        { id: 2, name: '轴承', slug: 'bearings', image: 'https://via.placeholder.com/300x300/FF7D00/ffffff?text=轴承', count: 86 },
        { id: 3, name: '五金工具', slug: 'tools', image: 'https://via.placeholder.com/300x300/00B42A/ffffff?text=五金工具', count: 156 },
        { id: 4, name: '电气元件', slug: 'electronics', image: 'https://via.placeholder.com/300x300/722ED1/ffffff?text=电气元件', count: 98 },
        { id: 5, name: '劳保用品', slug: 'safety', image: 'https://via.placeholder.com/300x300/13C2C2/ffffff?text=劳保用品', count: 67 },
        { id: 6, name: '液压气动', slug: 'hydraulic', image: 'https://via.placeholder.com/300x300/EB2F96/ffffff?text=液压气动', count: 78 },
      ];
      this.setData({ collections: mockCollections });
    } finally {
      this.setData({ collectionsLoading: false });
    }
  },
});