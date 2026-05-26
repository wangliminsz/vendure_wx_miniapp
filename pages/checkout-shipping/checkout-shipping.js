const app = getApp();
const {
  graphqlClient
} = require('../../utils/api.js');

Page({
  data: {
    isLoading: true,
    activeOrder: null,
    orderSummary: null,
    addresses: [],
    selectedAddressId: '',
    selectedIndex: 0,
    shippingAddress: null,
    hasShippingAddress: false,
    eligibleShippingMethods: [],
    selectedShippingMethod: null,
    isShippingDataLoaded: false,
    isSubmitting: false
  },

  onLoad() {
    this.loadOrderData();
  },

  onShow() {
    this.loadActiveOrder();
    this.loadAddresses();
  },

  async loadOrderData() {
    this.setData({
      isLoading: true
    });
    wx.showLoading({
      title: '加载中...'
    });

    try {
      await this.loadActiveOrder();
      await this.loadAddresses();
    } catch (error) {
      console.error('加载结算数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
      this.setData({
        isLoading: false
      });
    }
  },

  async loadActiveOrder() {
    const query = `
      query GetActiveOrder {
        activeOrder {
          id
          code
          state
          subTotalWithTax
          shippingWithTax
          totalWithTax
          currencyCode
          shippingAddress {
            fullName
            phoneNumber
            streetLine1
            streetLine2
            city
            province
            country
            postalCode
          }
          shippingLines {
            id
            shippingMethod {
              id
              name
            }
          }
          lines {
            id
            quantity
            linePriceWithTax
            featuredAsset {
              id
              preview
            }
            productVariant {
              id
              name
              sku
              featuredAsset {
                preview
              }
            }
          }
        }
      }
    `;

    try {
      const data = await graphqlClient.query(query);

      if (data?.activeOrder) {
        const order = data.activeOrder;
        const currency = order.currencyCode || 'CNY';

        const linesWithImages = order.lines.map(line => ({
          ...line,
          image: line.featuredAsset?.preview || line.productVariant.featuredAsset?.preview || '',
          formattedPrice: this.formatPrice(Math.round(line.linePriceWithTax), currency)
        }));

        this.setData({
          activeOrder: {
            ...order,
            lines: linesWithImages
          }
        });

        this.updateOrderSummary(currency);
      }
    } catch (error) {
      console.error('加载订单失败:', error);
      throw error;
    }
  },

  updateOrderSummary(currency) {
    if (!this.data.activeOrder) return;

    const order = this.data.activeOrder;
    const subTotal = Math.round(order.subTotalWithTax || 0);
    const shipping = Math.round(order.shippingWithTax || 0);
    const total = subTotal + shipping;

    const summary = {
      subTotal: this.formatPrice(subTotal, currency),
      shipping: this.formatPrice(shipping, currency),
      total: this.formatPrice(total, currency),
      currency: currency
    };

    this.setData({
      orderSummary: summary
    });
  },

  async loadAddresses() {
    const query = `
      query GetCustomerAddresses {
        activeCustomer {
          addresses {
            id
            fullName
            phoneNumber
            streetLine1
            streetLine2
            city
            province
            country {
              code
              name
            }
            postalCode
            defaultShippingAddress
            defaultBillingAddress
          }
        }
      }
    `;

    try {
      const data = await graphqlClient.query(query);
      const addresses = data?.activeCustomer?.addresses || [];

      const sortedAddresses = [...addresses].sort((a, b) => {
        const nameA = (a.fullName || '').toLowerCase();
        const nameB = (b.fullName || '').toLowerCase();
        return nameA.localeCompare(nameB, 'zh-CN');
      });

      this.setData({
        addresses: sortedAddresses
      });

      const orderShippingAddress = this.data.activeOrder?.shippingAddress;
      const hasValidOrderAddress = orderShippingAddress && orderShippingAddress.fullName && orderShippingAddress.phoneNumber;

      if (hasValidOrderAddress) {
        const matchingAddress = sortedAddresses.find(addr => 
          addr.fullName === orderShippingAddress.fullName && 
          addr.phoneNumber === orderShippingAddress.phoneNumber
        );
        
        if (matchingAddress) {
          const index = sortedAddresses.findIndex(addr => addr.id === matchingAddress.id);
          this.setData({
            selectedAddressId: matchingAddress.id,
            selectedIndex: index,
            shippingAddress: matchingAddress,
            hasShippingAddress: true
          });
        } else {
          this.setData({
            selectedAddressId: '',
            selectedIndex: -1,
            shippingAddress: orderShippingAddress,
            hasShippingAddress: true
          });
        }
        await this.loadEligibleShippingMethods();
      } else {
        const defaultAddress = sortedAddresses.find(addr => addr.defaultShippingAddress);

        if (defaultAddress) {
          const index = sortedAddresses.findIndex(addr => addr.id === defaultAddress.id);
          this.setData({
            selectedAddressId: defaultAddress.id,
            selectedIndex: index,
            shippingAddress: defaultAddress,
            hasShippingAddress: true
          });
          await this.loadEligibleShippingMethods();
        } else if (sortedAddresses.length > 0) {
          const firstAddress = sortedAddresses[0];
          this.setData({
            selectedAddressId: firstAddress.id,
            selectedIndex: 0,
            shippingAddress: firstAddress,
            hasShippingAddress: true
          });
          await this.loadEligibleShippingMethods();
        } else {
          this.setData({
            hasShippingAddress: false,
            shippingAddress: null,
            eligibleShippingMethods: [],
            selectedShippingMethod: null
          });
        }
      }
    } catch (error) {
      console.error('加载地址失败:', error);
      this.setData({
        hasShippingAddress: false,
        addresses: []
      });
    }
  },

  async setShippingAddress(address) {
    const mutation = `
      mutation SetOrderShippingAddress($input: CreateAddressInput!) {
        setOrderShippingAddress(input: $input) {
          ... on Order {
            id
          }
          ... on ErrorResult {
            errorCode
            message
          }
        }
      }
    `;

    let countryCode = 'CN';
    if (address.country) {
      if (typeof address.country === 'string') {
        countryCode = address.country;
      } else if (address.country.code) {
        countryCode = address.country.code;
      }
    }

    const input = {
      fullName: address.fullName,
      phoneNumber: address.phoneNumber,
      streetLine1: address.streetLine1,
      streetLine2: address.streetLine2 || '',
      city: address.city || '',
      province: address.province || '',
      postalCode: address.postalCode || '',
      countryCode: countryCode
    };

    try {
      const result = await graphqlClient.mutate(mutation, {
        input
      });

      if (result?.setOrderShippingAddress?.__typename === 'ErrorResult') {
        console.error('设置配送地址失败:', result.setOrderShippingAddress.message);
      }
    } catch (error) {
      console.error('设置配送地址失败:', error);
    }
  },

  async loadEligibleShippingMethods() {
    const query = `
      query GetEligibleShippingMethods {
        eligibleShippingMethods {
          id
          code
          name
          description
          price
          priceWithTax
        }
      }
    `;

    try {
      const data = await graphqlClient.query(query);

      if (data?.eligibleShippingMethods) {
        const methods = data.eligibleShippingMethods;
        const currency = this.data.activeOrder?.currencyCode || 'CNY';

        const methodsWithPrice = methods.map(method => ({
          ...method,
          formattedPrice: this.formatPrice(method.priceWithTax, currency)
        }));

        this.setData({
          eligibleShippingMethods: methodsWithPrice,
          isShippingDataLoaded: true
        });

        const currentSelectedMethod = this.data.selectedShippingMethod;

        if (currentSelectedMethod && currentSelectedMethod.id) {
          const selectedMethodStillAvailable = methods.find(m => m.id === currentSelectedMethod.id);
          if (selectedMethodStillAvailable) {
            this.setData({
              selectedShippingMethod: {
                ...selectedMethodStillAvailable,
                formattedPrice: this.formatPrice(selectedMethodStillAvailable.priceWithTax, currency)
              }
            });
            this.updateOrderSummary(currency);
            return;
          }
        }

        const orderHasShippingMethod = this.data.activeOrder?.shippingLines?.length > 0;
        const existingMethodId = this.data.activeOrder?.shippingLines?.[0]?.shippingMethod?.id;

        if (existingMethodId) {
          const existingMethod = methods.find(m => m.id === existingMethodId);
          if (existingMethod) {
            this.setData({
              selectedShippingMethod: existingMethod
            });
            this.updateOrderSummary(currency);
            return;
          }
        }

        if (!orderHasShippingMethod && methods.length > 0) {
          const defaultMethod = methods[0];
          await this.setDefaultShippingMethod(defaultMethod, currency);
        }
      }
    } catch (error) {
      console.error('加载配送方式失败:', error);
    }
  },

  async setDefaultShippingMethod(method, currency) {
    const mutation = `
      mutation SetOrderShippingMethod($shippingMethodId: [ID!]!) {
        setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
          ... on Order {
            id
            shippingWithTax
            totalWithTax
          }
        }
      }
    `;

    try {
      const result = await graphqlClient.mutate(mutation, {
        shippingMethodId: [method.id]
      });

      if (result?.setOrderShippingMethod) {
        this.setData({
          selectedShippingMethod: {
            ...method,
            formattedPrice: this.formatPrice(method.priceWithTax, currency)
          }
        });

        if (this.data.activeOrder && result.setOrderShippingMethod.shippingWithTax !== undefined) {
          const updatedOrder = {
            ...this.data.activeOrder,
            shippingWithTax: result.setOrderShippingMethod.shippingWithTax,
            totalWithTax: result.setOrderShippingMethod.totalWithTax
          };
          this.setData({
            activeOrder: updatedOrder
          });
        }

        this.updateOrderSummary(currency);
      }
    } catch (error) {
      console.error('自动设置配送方式失败:', error);
      this.setData({
        selectedShippingMethod: {
          ...method,
          formattedPrice: this.formatPrice(method.priceWithTax, currency)
        }
      });
      this.updateOrderSummary(currency);
    }
  },

  onAddressChange(e) {
    if (this.data.activeOrder && this.data.activeOrder.state !== 'AddingItems') {
      wx.showToast({
        title: '订单状态不允许修改配送地址',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const index = parseInt(e.detail.value);
    const address = this.data.addresses[index];
    
    if (address) {
      this.setData({
        selectedAddressId: address.id,
        selectedIndex: index,
        shippingAddress: address,
        hasShippingAddress: true
      });
      this.loadEligibleShippingMethods();
    }
  },

  async onShippingMethodSelect(e) {
    if (this.data.activeOrder && this.data.activeOrder.state !== 'AddingItems') {
      wx.showToast({
        title: '订单状态不允许修改配送方式',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const methodId = e.currentTarget.dataset.id;
    const method = this.data.eligibleShippingMethods.find(m => m.id === methodId);
    const currency = this.data.activeOrder?.currencyCode || 'CNY';

    if (method) {
      this.setData({
        selectedShippingMethod: method
      });

      const mutation = `
        mutation SetOrderShippingMethod($shippingMethodId: [ID!]!) {
          setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
            ... on Order {
              id
              shippingWithTax
              totalWithTax
            }
          }
        }
      `;

      try {
        const result = await graphqlClient.mutate(mutation, {
          shippingMethodId: [method.id]
        });

        if (result?.setOrderShippingMethod) {
          if (this.data.activeOrder && result.setOrderShippingMethod.shippingWithTax !== undefined) {
            const updatedOrder = {
              ...this.data.activeOrder,
              shippingWithTax: result.setOrderShippingMethod.shippingWithTax,
              totalWithTax: result.setOrderShippingMethod.totalWithTax
            };
            this.setData({
              activeOrder: updatedOrder
            });
          }

          this.updateOrderSummary(currency);
        }
      } catch (error) {
        console.error('更新配送方式失败:', error);
        this.updateOrderSummary(currency);
      }
    }
  },

  async proceedToPayment() {
    if (!this.data.hasShippingAddress || !this.data.selectedShippingMethod) {
      wx.showToast({
        title: '请完善配送信息',
        icon: 'none'
      });
      return;
    }

    this.setData({
      isSubmitting: true
    });
    wx.showLoading({
      title: '提交中...'
    });

    try {
      await this.setShippingAddress(this.data.shippingAddress);
      
      wx.navigateTo({
        url: '/pages/checkout-payment/checkout-payment'
      });
    } catch (error) {
      console.error('提交失败:', error);
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
      this.setData({
        isSubmitting: false
      });
    }
  },

  goToAddAddress() {
    wx.navigateTo({
      url: '/pages/address/address'
    });
  },

  goBack() {
    wx.navigateBack();
  },

  formatPrice(price, currencyCode) {
    if (price === undefined || price === null || price === '') {
      return '';
    }
    const currency = currencyCode || 'CNY';
    const symbol = currency === 'CNY' ? '¥ ' : currency;
    const cleanCents = Math.round(Number(price));
    const formattedPrice = (cleanCents / 100).toFixed(2);
    return `${symbol}${formattedPrice}`;
  }
});