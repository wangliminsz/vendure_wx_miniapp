const app = getApp();
const {
  graphqlClient
} = require('../../utils/api.js');

Page({
  data: {
    isLoading: true,
    activeOrder: null,
    orderSummary: null,
    countdownSeconds: 0,
    countdownDisplay: '00:00:00',
    isExpired: false,
    isConfirming: false,
    customerMessage: '',
    addresses: [],
    selectedInvoiceAddressId: '',
    selectedInvoiceIndex: 0,
    invoiceAddress: null,
    hasInvoiceAddress: false
  },

  onLoad() {
    this.loadOrderData();
  },

  onShow() {
    this.loadActiveOrder();
    this.loadAddresses();
  },

  onUnload() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
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
      this.startCountdown();
    } catch (error) {
      console.error('加载订单数据失败:', error);
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
          shippingLines {
            id
            shippingMethod {
              id
              name
            }
          }
          billingAddress {
            fullName
            phoneNumber
            streetLine1
            streetLine2
            city
            province
            country
            postalCode
          }
          customFields {
            customerMessage
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

        const orderWithLines = {
          ...order,
          lines: linesWithImages
        };
        
        const dataToSet = {
          activeOrder: orderWithLines
        };
        
        if (order.customFields?.customerMessage) {
          dataToSet.customerMessage = order.customFields.customerMessage;
        }
        
        this.setData(dataToSet);
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

      const orderBillingAddress = this.data.activeOrder?.billingAddress;
      const hasValidOrderAddress = orderBillingAddress && orderBillingAddress.fullName && orderBillingAddress.phoneNumber;

      if (hasValidOrderAddress) {
        const matchingAddress = sortedAddresses.find(addr =>
          addr.fullName === orderBillingAddress.fullName &&
          addr.phoneNumber === orderBillingAddress.phoneNumber
        );

        if (matchingAddress) {
          const index = sortedAddresses.findIndex(addr => addr.id === matchingAddress.id);
          this.setData({
            selectedInvoiceAddressId: matchingAddress.id,
            selectedInvoiceIndex: index,
            invoiceAddress: matchingAddress,
            hasInvoiceAddress: true
          });
        } else {
          this.setData({
            selectedInvoiceAddressId: '',
            selectedInvoiceIndex: -1,
            invoiceAddress: orderBillingAddress,
            hasInvoiceAddress: true
          });
        }
      } else {
        const defaultAddress = sortedAddresses.find(addr => addr.defaultBillingAddress);

        if (defaultAddress) {
          const index = sortedAddresses.findIndex(addr => addr.id === defaultAddress.id);
          this.setData({
            selectedInvoiceAddressId: defaultAddress.id,
            selectedInvoiceIndex: index,
            invoiceAddress: defaultAddress,
            hasInvoiceAddress: true
          });
        } else if (sortedAddresses.length > 0) {
          const firstAddress = sortedAddresses[0];
          this.setData({
            selectedInvoiceAddressId: firstAddress.id,
            selectedInvoiceIndex: 0,
            invoiceAddress: firstAddress,
            hasInvoiceAddress: true
          });
        } else {
          this.setData({
            hasInvoiceAddress: false,
            invoiceAddress: null
          });
        }
      }
    } catch (error) {
      console.error('加载地址失败:', error);
      this.setData({
        hasInvoiceAddress: false,
        addresses: []
      });
    }
  },

  onInvoiceAddressChange(e) {
    if (this.data.activeOrder && this.data.activeOrder.state !== 'AddingItems') {
      wx.showToast({
        title: '订单状态不允许修改账单地址',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const index = parseInt(e.detail.value);
    const address = this.data.addresses[index];

    if (address) {
      this.setData({
        selectedInvoiceAddressId: address.id,
        selectedInvoiceIndex: index,
        invoiceAddress: address,
        hasInvoiceAddress: true
      });
    }
  },

  startCountdown() {
    const ONE_HOUR_MS = 3600 * 1000;
    const deadline = Date.now() + ONE_HOUR_MS;

    this.updateCountdown(deadline);

    this.countdownInterval = setInterval(() => {
      this.updateCountdown(deadline);
    }, 1000);
  },

  updateCountdown(deadline) {
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((deadline - now) / 1000));

    if (remaining <= 0) {
      this.setData({
        countdownSeconds: 0,
        countdownDisplay: '00:00:00',
        isExpired: true
      });
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
      return;
    }

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const secs = remaining % 60;
    const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    this.setData({
      countdownSeconds: remaining,
      countdownDisplay: display,
      isExpired: false
    });
  },

  formatCountdown(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
  },

  async setBillingAddress(address) {
    const mutation = `
      mutation SetOrderBillingAddress($input: CreateAddressInput!) {
        setOrderBillingAddress(input: $input) {
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
      const result = await graphqlClient.mutate(mutation, { input });

      if (result?.setOrderBillingAddress?.__typename === 'ErrorResult') {
        console.error('设置账单地址失败:', result.setOrderBillingAddress.message);
        throw new Error('设置账单地址失败: ' + result.setOrderBillingAddress.message);
      }
      console.log('账单地址设置成功');
    } catch (error) {
      console.error('设置账单地址失败:', error);
      throw error;
    }
  },

  async setOrderCustomFields(customFields) {
    const mutation = `
      mutation SetOrderCustomFields($input: UpdateOrderInput!) {
        setOrderCustomFields(input: $input) {
          ... on Order {
            id
            code
            state
            customFields {
              customerMessage
            }
          }
          ... on ErrorResult {
            errorCode
            message
          }
        }
      }
    `;

    try {
      const result = await graphqlClient.mutate(mutation, { input: { customFields } });

      if (result?.setOrderCustomFields?.__typename === 'ErrorResult') {
        console.error('设置订单自定义字段失败:', result.setOrderCustomFields.message);
        throw new Error('设置订单自定义字段失败: ' + result.setOrderCustomFields.message);
      }
      console.log('订单自定义字段设置成功');
    } catch (error) {
      console.error('设置订单自定义字段失败:', error);
      throw error;
    }
  },

  async getOrderByCode(orderCode) {
    const query = `
      query GetOrderByCode($code: String!) {
        orderByCode(code: $code) {
          id
          code
          state
        }
      }
    `;

    const result = await graphqlClient.query(query, { code: orderCode });
    return result?.orderByCode;
  },

  async transitionOrderState(targetState) {
    const mutation = `
      mutation TransitionOrderState($state: String!) {
        transitionOrderToState(state: $state) {
          ... on Order {
            id
            state
            code
          }
          ... on ErrorResult {
            errorCode
            message
          }
        }
      }
    `;

    const result = await graphqlClient.mutate(mutation, { state: targetState });
    
    if (result?.transitionOrderToState) {
      const response = result.transitionOrderToState;
      if (response.__typename === 'ErrorResult') {
        console.error(`订单状态转换到 ${targetState} 失败:`, response.message);
        throw new Error(response.message);
      }
      console.log(`订单状态转换到 ${targetState} 成功:`, response);
      return response;
    }
    throw new Error('订单状态转换返回为空');
  },

  async simulatePayment(orderId) {
    const mutation = `
      mutation SimulatePayment($orderId: ID!) {
        simulatePayment(orderId: $orderId) {
          id
          code
          state
          payments {
            id
            method
            state
          }
        }
      }
    `;

    const result = await graphqlClient.mutate(mutation, { orderId });
    
    if (result?.simulatePayment) {
      console.log('模拟支付成功:', result.simulatePayment);
      return result.simulatePayment;
    }
    throw new Error('模拟支付返回为空');
  },

  async confirmOrder() {
    if (this.data.isConfirming) return;

    const invoiceAddress = this.data.invoiceAddress;
    if (!invoiceAddress) {
      wx.showToast({
        title: '请选择账单地址',
        icon: 'none'
      });
      return;
    }

    this.setData({
      isConfirming: true
    });
    wx.showLoading({
      title: '处理中...'
    });

    try {
      await this.setBillingAddress(invoiceAddress);

      if (this.data.customerMessage) {
        await this.setOrderCustomFields({
          customerMessage: this.data.customerMessage
        });
      }

      const orderCode = this.data.activeOrder?.code;
      if (!orderCode) {
        throw new Error('没有找到订单号');
      }

      console.log('开始支付流程，订单号:', orderCode);

      const initialOrder = await this.getOrderByCode(orderCode);
      console.log('当前订单状态:', initialOrder?.state);

      if (initialOrder?.state === 'AddingItems') {
        console.log('订单处于 AddingItems 状态，转换到 ArrangingPayment...');
        await this.transitionOrderState('ArrangingPayment');
      }

      const orderData = await this.getOrderByCode(orderCode);
      if (!orderData?.id) {
        throw new Error('无法获取订单ID');
      }

      console.log('调用模拟支付 (simulatePayment)...');
      const paymentResult = await this.simulatePayment(orderData.id);
      console.log('模拟支付结果:', paymentResult);

      wx.showToast({
        title: '订单已确认',
        icon: 'success'
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/order-confirmation/order-confirmation?code=' + orderCode
        });
      }, 1500);
    } catch (error) {
      console.error('确认订单失败:', error);
      wx.showToast({
        title: '确认失败: ' + (error.message || error),
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
      this.setData({
        isConfirming: false
      });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  onMessageInput(e) {
    this.setData({
      customerMessage: e.detail.value
    });
  },

  goToAddAddress() {
    wx.navigateTo({
      url: '/pages/address/address'
    });
  },

  goToHome() {
    wx.switchTab({
      url: '/pages/home/home'
    });
  },

  async cancelOrder() {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消此订单吗？取消后将无法恢复。',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '取消中...'
          });

          try {
            const mutation = `
              mutation TransitionOrderToState {
                transitionOrderToState(state: "Cancelled") {
                  ... on Order {
                    id
                    state
                    code
                  }
                  ... on ErrorResult {
                    errorCode
                    message
                  }
                }
              }
            `;

            const result = await graphqlClient.mutate(mutation);

            if (result?.transitionOrderToState) {
              const response = result.transitionOrderToState;

              if (response.__typename === 'ErrorResult') {
                console.error('取消订单失败:', response.message);
                wx.showToast({
                  title: '取消失败: ' + response.message,
                  icon: 'none'
                });
              } else if (response.state === 'Cancelled') {
                wx.showToast({
                  title: '订单已取消',
                  icon: 'success'
                });
                setTimeout(() => {
                  wx.switchTab({
                    url: '/pages/home/home'
                  });
                }, 1500);
              }
            }
          } catch (error) {
            console.error('取消订单失败:', error);
            wx.showToast({
              title: '取消失败，请重试',
              icon: 'none'
            });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  }
});