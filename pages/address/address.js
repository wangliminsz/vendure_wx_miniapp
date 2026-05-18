const { getCustomerAddresses, deleteAddress } = require('../../providers/shop/customer/customer');

Page({
  data: {
    addresses: [
      {
        id: '1',
        receiver: '张三',
        phone: '13812345678',
        province: '广东省',
        city: '深圳市',
        district: '南山区',
        detail: '科技园南路88号',
        isDefault: true,
      },
      {
        id: '2',
        receiver: '李四',
        phone: '13987654321',
        province: '广东省',
        city: '广州市',
        district: '天河区',
        detail: '中山大道123号',
        isDefault: false,
      },
    ],
    mode: 'list',
  },

  onLoad() {
    this.loadAddresses();
  },

  async loadAddresses() {
    try {
      const addresses = await getCustomerAddresses();
      if (addresses && addresses.length > 0) {
        const formattedAddresses = addresses.map((addr, index) => ({
          id: addr.id,
          receiver: addr.fullName,
          phone: addr.phoneNumber,
          province: addr.province || '',
          city: addr.city || '',
          district: '',
          detail: addr.streetLine1 || '',
          isDefault: addr.defaultShippingAddress,
        }));
        this.setData({
          addresses: formattedAddresses,
        });
      }
    } catch (error) {
      console.error('Failed to load addresses:', error);
    }
  },

  onSelectAddress(e) {
    const addressId = e.currentTarget.dataset.id;
    const address = this.data.addresses.find(a => a.id === addressId);

    if (this.data.mode === 'select' && address) {
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage) {
        prevPage.setData({
          selectedAddress: address,
        });
      }
      wx.navigateBack();
    }
  },

  onAddAddress() {
    wx.navigateTo({
      url: '/pages/addressForm/addressForm',
    });
  },

  onEditAddress(e) {
    const addressId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/addressForm/addressForm?id=${addressId}`,
    });
  },

  onDeleteAddress(e) {
    const addressId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '提示',
      content: '确定要删除该地址吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await deleteAddress(addressId);
            const addresses = this.data.addresses.filter(a => a.id !== addressId);
            this.setData({
              addresses,
            });
            wx.showToast({
              title: '删除成功',
              icon: 'success',
            });
          } catch (error) {
            console.error('Failed to delete address:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none',
            });
          }
        }
      },
    });
  },
});
