const app = getApp();
const { graphqlClient } = require('../../utils/api.js');

Page({
  data: {
    addresses: [],
    originalAddresses: [],
    filteredAddresses: [],
    isLoading: true,
    isAddingAddress: false,
    editingAddress: null,
    showDeleteModal: false,
    addressToDelete: null,
    sortField: 'name',
    sortOrder: 'asc',
    searchKeyword: '',
    hasSearched: false,
    formData: {
      fullName: '',
      address: '',
      country: 'CN',
      phoneNumber: '',
      defaultShipping: false,
      defaultBilling: false
    }
  },

  async onLoad() {
    await app.initPromise;
    await app.loginPromise;
    this.loadAddresses();
  },

  goBack() {
    this.cancelEdit();
    wx.navigateBack();
  },

  async loadAddresses() {
    this.setData({ isLoading: true });

    try {
      const query = `
        query GetCustomerAddresses {
          activeCustomer {
            addresses {
              id
              fullName
              phoneNumber
              streetLine1
              city
              province
              country {
                code
                name
              }
              defaultShippingAddress
              defaultBillingAddress
            }
          }
        }
      `;

      const data = await graphqlClient.query(query);
      console.log('加载地址列表:', data);

      if (data?.activeCustomer?.addresses) {
        const addresses = data.activeCustomer.addresses;
        this.setData({
          addresses: addresses,
          originalAddresses: addresses
        });
        this.sortAddresses();
      } else {
        this.setData({ addresses: [], originalAddresses: [] });
      }
    } catch (error) {
      console.error('加载地址失败:', error);
      wx.showToast({
        title: '加载地址失败',
        icon: 'none'
      });
      this.setData({ addresses: [], originalAddresses: [] });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  async fetchVendureCustomerInfo() {
    try {
      const query = `
        query GetCustomerInfo {
          activeCustomer {
            lastName
            phoneNumber
          }
        }
      `;

      const data = await graphqlClient.query(query);
      console.log('获取用户信息:', data);

      if (data?.activeCustomer) {
        return {
          lastName: data.activeCustomer.lastName || '',
          phoneNumber: data.activeCustomer.phoneNumber || ''
        };
      }
      return { lastName: '', phoneNumber: '' };
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return { lastName: '', phoneNumber: '' };
    }
  },

  async startAddAddress() {
    // 1. 首先从 localStorage 读取
    let fullName = wx.getStorageSync('userName') || '';
    let phoneNumber = wx.getStorageSync('mobile') || '';

    // 2. 如果 localStorage 没有数据，则从 Vendure 获取
    if (!fullName || !phoneNumber) {
      const customerInfo = await this.fetchVendureCustomerInfo();
      if (!fullName && customerInfo.lastName) {
        fullName = customerInfo.lastName;
      }
      if (!phoneNumber && customerInfo.phoneNumber) {
        phoneNumber = customerInfo.phoneNumber;
      }
    }

    this.setData({
      isAddingAddress: true,
      editingAddress: null,
      formData: {
        fullName: fullName,
        address: '',
        country: 'CN',
        phoneNumber: phoneNumber,
        defaultShipping: false,
        defaultBilling: false
      }
    });
  },

  startEditAddress(e) {
    const address = e.currentTarget.dataset.address;

    this.setData({
      isAddingAddress: true,
      editingAddress: address,
      formData: {
        fullName: address.fullName || '',
        address: address.streetLine1 || '',
        country: address.country?.code || 'CN',
        phoneNumber: address.phoneNumber || '',
        defaultShipping: address.defaultShippingAddress || false,
        defaultBilling: address.defaultBillingAddress || false
      }
    });
  },

  onFormInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  onCheckboxChange(e) {
    const field = e.currentTarget.dataset.field;
    const checked = e.detail.value.length > 0;
    this.setData({
      [`formData.${field}`]: checked
    });
  },

  async saveAddress() {
    const { formData, editingAddress } = this.data;

    if (!formData.fullName || !formData.address || !formData.phoneNumber) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      let mutation;
      let variables;

      if (editingAddress) {
        mutation = `
          mutation UpdateAddress($input: UpdateAddressInput!) {
            updateCustomerAddress(input: $input) {
              id
              fullName
              phoneNumber
              streetLine1
              country {
                code
                name
              }
              defaultShippingAddress
              defaultBillingAddress
            }
          }
        `;
        variables = {
          input: {
            id: editingAddress.id,
            fullName: formData.fullName,
            streetLine1: formData.address,
            countryCode: formData.country,
            phoneNumber: formData.phoneNumber,
            defaultShippingAddress: formData.defaultShipping,
            defaultBillingAddress: formData.defaultBilling
          }
        };
      } else {
        mutation = `
          mutation CreateAddress($input: CreateAddressInput!) {
            createCustomerAddress(input: $input) {
              id
              fullName
              phoneNumber
              streetLine1
              country {
                code
                name
              }
              defaultShippingAddress
              defaultBillingAddress
            }
          }
        `;
        variables = {
          input: {
            fullName: formData.fullName,
            streetLine1: formData.address,
            countryCode: formData.country,
            phoneNumber: formData.phoneNumber,
            defaultShippingAddress: formData.defaultShipping,
            defaultBillingAddress: formData.defaultBilling
          }
        };
      }

      const result = await graphqlClient.mutate(mutation, variables);
      console.log('保存地址结果:', result);

      wx.hideLoading();
      wx.showToast({
        title: editingAddress ? '修改成功' : '添加成功',
        icon: 'success'
      });

      this.cancelEdit();
      this.loadAddresses();
    } catch (error) {
      console.error('保存地址失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '保存失败: ' + (error.message || '请重试'),
        icon: 'none'
      });
    }
  },

  cancelEdit() {
    this.setData({
      isAddingAddress: false,
      editingAddress: null,
      formData: {
        fullName: '',
        address: '',
        country: 'CN',
        phoneNumber: '',
        defaultShipping: false,
        defaultBilling: false
      }
    });
  },

  setSortField(e) {
    const field = e.currentTarget.dataset.field;
    let sortOrder = 'asc';

    if (this.data.sortField === field) {
      sortOrder = this.data.sortOrder === 'asc' ? 'desc' : 'asc';
    }

    this.setData({
      sortField: field,
      sortOrder: sortOrder
    });

    this.sortAddresses();
  },

  sortAddresses() {
    const { addresses, sortField, sortOrder } = this.data;
    if (addresses.length <= 1) return;

    // 找到默认收货地址和默认账单地址
    let defaultShippingAddress = null;
    let defaultBillingAddress = null;
    
    for (let addr of addresses) {
      if (addr.defaultShippingAddress) {
        defaultShippingAddress = addr;
      }
      if (addr.defaultBillingAddress) {
        defaultBillingAddress = addr;
      }
    }

    // 构建排序后的数组
    const sortedAddresses = [];
    
    // 添加默认收货地址（如果存在）
    if (defaultShippingAddress) {
      sortedAddresses.push(defaultShippingAddress);
    }
    
    // 添加默认账单地址（如果存在且不是默认收货地址）
    if (defaultBillingAddress && (!defaultShippingAddress || defaultBillingAddress.id !== defaultShippingAddress.id)) {
      sortedAddresses.push(defaultBillingAddress);
    }
    
    // 收集剩余地址（不包含已经添加的默认地址）
    const remainingAddresses = addresses.filter(addr => {
      if (defaultShippingAddress && addr.id === defaultShippingAddress.id) return false;
      if (defaultBillingAddress && addr.id === defaultBillingAddress.id) return false;
      return true;
    });
    
    // 对剩余地址进行排序
    remainingAddresses.sort((a, b) => {
      let valueA, valueB;

      if (sortField === 'name') {
        valueA = (a.fullName || '').toLowerCase();
        valueB = (b.fullName || '').toLowerCase();
      } else {
        valueA = (a.streetLine1 || '').toLowerCase();
        valueB = (b.streetLine1 || '').toLowerCase();
      }

      if (sortOrder === 'asc') {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    });
    
    // 合并结果
    const sortedList = [...sortedAddresses, ...remainingAddresses];
    
    this.setData({
      addresses: sortedList
    });
    
    // 如果当前有搜索结果，重新搜索以应用新的排序
    if (this.data.hasSearched && this.data.searchKeyword) {
      this.filterAddresses();
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  // 清空搜索
  onClearSearch() {
    this.setData({
      searchKeyword: '',
      filteredAddresses: [],
      hasSearched: false
    });
  },

  // 执行搜索
  onSearch() {
    this.setData({
      hasSearched: true
    });
    this.filterAddresses();
  },

  // 过滤地址
  filterAddresses() {
    const { originalAddresses, searchKeyword } = this.data;
    
    if (!searchKeyword || searchKeyword.trim() === '') {
      this.setData({
        filteredAddresses: []
      });
      return;
    }
    
    const keyword = searchKeyword.trim().toLowerCase();
    
    const filtered = originalAddresses.filter(addr => {
      const name = (addr.fullName || '').toLowerCase();
      const address = (addr.streetLine1 || '').toLowerCase();
      const phone = (addr.phoneNumber || '').toLowerCase();
      
      return name.includes(keyword) || address.includes(keyword) || phone.includes(keyword);
    });
    
    // 对过滤结果也应用相同的排序逻辑
    let defaultShippingAddress = null;
    let defaultBillingAddress = null;
    
    for (let addr of filtered) {
      if (addr.defaultShippingAddress) {
        defaultShippingAddress = addr;
      }
      if (addr.defaultBillingAddress) {
        defaultBillingAddress = addr;
      }
    }
    
    const sortedFiltered = [];
    
    if (defaultShippingAddress) {
      sortedFiltered.push(defaultShippingAddress);
    }
    
    if (defaultBillingAddress && (!defaultShippingAddress || defaultBillingAddress.id !== defaultShippingAddress.id)) {
      sortedFiltered.push(defaultBillingAddress);
    }
    
    const remainingFiltered = filtered.filter(addr => {
      if (defaultShippingAddress && addr.id === defaultShippingAddress.id) return false;
      if (defaultBillingAddress && addr.id === defaultBillingAddress.id) return false;
      return true;
    });
    
    const { sortField, sortOrder } = this.data;
    remainingFiltered.sort((a, b) => {
      let valueA, valueB;

      if (sortField === 'name') {
        valueA = (a.fullName || '').toLowerCase();
        valueB = (b.fullName || '').toLowerCase();
      } else {
        valueA = (a.streetLine1 || '').toLowerCase();
        valueB = (b.streetLine1 || '').toLowerCase();
      }

      if (sortOrder === 'asc') {
        return valueA.localeCompare(valueB);
      } else {
        return valueB.localeCompare(valueA);
      }
    });
    
    this.setData({
      filteredAddresses: [...sortedFiltered, ...remainingFiltered]
    });
  },

  showDeleteConfirm(e) {
    const addressId = e.currentTarget.dataset.id;
    this.setData({
      showDeleteModal: true,
      addressToDelete: addressId
    });
  },

  hideDeleteModal() {
    this.setData({
      showDeleteModal: false,
      addressToDelete: null
    });
  },

  async confirmDelete() {
    if (!this.data.addressToDelete) return;

    wx.showLoading({ title: '删除中...' });

    try {
      const mutation = `
        mutation DeleteAddress($id: ID!) {
          deleteCustomerAddress(id: $id) {
            success
          }
        }
      `;

      const result = await graphqlClient.mutate(mutation, {
        id: this.data.addressToDelete
      });
      console.log('删除地址结果:', result);

      wx.hideLoading();
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });

      this.hideDeleteModal();
      this.loadAddresses();
    } catch (error) {
      console.error('删除地址失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  }
});
