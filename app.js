const config = require('./config.js');

App({
  globalData: {
    userInfo: null,
    openid: '',
    token: '',
    cartItems: [],
    customerInfo: null,
    // 2025-05-19 
    baseUrl: config.baseUrl, // 直接用！
    isLogin: false
    // 2025-05-19 
  },

  async onLaunch() {

    // this.checkLoginStatus();
    this.initChannel();

    // 2026-05-19 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    
    this.checkAndLogin();

    // 2026-05-19 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


    //云开发

    // 实例化共享环境
    const mycloud = new wx.cloud.Cloud({
      resourceAppid: 'wx65ce07b8050f8ae4', // 资源方AppID
      resourceEnv: 'bkkschool-1304214433-4bo349633e7' // 共享给你的环境ID
    })
    mycloud.init().then(() => {
      console.log('2026-05-共享云环境初始化成功------------->')
      // 之后所有 wx.cloud 调用，都要用这个 cloud 实例
      // 比如：cloud.uploadFile、cloud.database()
    }).catch(err => {
      console.error('2026-05-初始化失败-------------->', err)
    })

    this.cloud = mycloud; // 把全局的共享云实例赋值给 this.cloud
    console.log('Cloud 已准备好:', this.cloud)

    //云开发

    // 登录 openid

    let myOpenId = wx.getStorageSync("openid")

    if (myOpenId) {
      console.log("2026-05-18-openid exist---------------->>>>")
    }else{
      wx.login({
        success: res => {
          if (res.code) {
            // Send the code to the backend server
            console.log(res.code, "  <<-----app.js code Launch by WX")
            wx.request({
              url: `${config.fastapiUrl}/api/checkYcgpLoginStatus`, // Your server endpoint
              method: 'POST',
              data: {
                code: res.code
              },
              success: res => {
                wx.setStorageSync('openid', res.data.openid)
  
                // 检查用户是否已经授权
                wx.getSetting({
                  success: res => {
                    this.globalData.userInfo = res.authSetting
                    // console.log("wx.getSetting???", res)
                  },
                  fail: err => {
                    console.error('app.js User---> Failed fetch Openid', err)
                  }
                })
  
                // 检查用户是否已经授权
  
              },
              fail: err => {
                console.error('app.js ---> Failed fetch Openid', err)
              }
            })
          } else {
            console.error('app.js ---> failed:', res.errMsg)
          }
        }
      })
    }

    // 登录 openid

    // 获取屏幕尺寸

    try {
      const windowInfo = wx.getWindowInfo()
      this.globalData.windowHeight = windowInfo.windowHeight;
      this.globalData.windowWidth = windowInfo.windowWidth;
      console.log('this.globalData--->>>', this.globalData)
    } catch (e) {
      //error
    }

    // 获取屏幕尺寸


  },

  // 2026-05-19 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    // 核心控制流：检查并登录
    checkAndLogin: function () {
      const token = wx.getStorageSync('vendure-auth-token');
  
      if (!token) {
        console.log('【Case 3】本地无 Token，正在执行静默注册/登录...');
        this.doWechatLogin();
      } else {
        console.log('本地发现 Token，正在验证其有效性...');
        this.verifyToken(token);
      }
    },
  
    // 1. 验证本地 Token 是否有效 (Case 1 & 2)
    verifyToken: function (token) {
      wx.request({
        url: this.globalData.baseUrl,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token}` // 👈 带上本地 Token
        },
        data: {
          query: `
            query CheckMe {
              me {
                id
                identifier
              }
            }
          `
        },
        success: (res) => {
          const me = res.data?.data?.me;
          if (me) {
            // 【Case 1】Token 依然有效（在 365 天内且没被后台清理）
            console.log('【Case 1】Token 畅通无阻，欢迎回来，用户 ID:', me.id);
            this.globalData.isLogin = true;
            // 执行你小程序后续的业务逻辑，比如触发首页拉取数据
          } else {
            // 【Case 2】Token 已过期（me 返回 null）
            console.log('【Case 2】Token 已过期（服务器返回 null），正在重新获取...');
            this.doWechatLogin();
          }
        },
        fail: () => {
          console.error('网络请求失败，可能是局域网断了');
        }
      });
    },
  
    // 2. 微信一键登录/注册核心（换取新 Token）
    doWechatLogin: function () {
      // 💡 实际业务中，先调用 wx.login() 拿到 code，然后发给你们自己的后端去微信换 openId
      // 这里我们直接用你已经在 REST Client 里跑通的测试 openId
      const mockOpenId = "ojaJ13YlqeIniIi0fOLtcHGf_e74"; 
      
      wx.request({
        url: this.globalData.baseUrl,
        method: 'POST',
        data: {
          query: `
            mutation AuthenticateWithWechat($openId: String!) {
              authenticate(input: { wechat: { openId: $openId } }) {
                ... on CurrentUser {
                  id
                }
              }
            }
          `,
          variables: {
            openId: mockOpenId
          }
        },
        success: (res) => {
          // 💡 核心：从 Vendure 的响应头中摘出全新 Token
          // 注意：有些微信基础库会把 header 的 key 变成小写，做个兼容处理
          const token = res.header['vendure-auth-token'] || res.header['Vendure-Auth-Token'];
          
          if (token) {
            wx.setStorageSync('vendure-auth-token', token);
            this.globalData.isLogin = true;
            console.log('🚀 全新 Token 已成功存入 Storage！');
          } else {
            console.error('登录成功但未在 Headers 中找到 vendure-auth-token');
          }
        }
      });
    },

  // 2026-05-19 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~




  // checkLoginStatus() {
  //   const token = wx.getStorageSync('vendure_token');
  //   const customerInfo = wx.getStorageSync('customer_info');

  //   if (token) {
  //     this.globalData.token = token;
  //     this.globalData.customerInfo = customerInfo;
  //   }
  // },

  initChannel() {
    this.channelToken = config.CHANNEL_TOKEN;
  },

  async login(code) {
    try {
      const response = await wx.request({
        url: `${config.production.API_URL}/auth/authentication`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'vendure-token': config.CHANNEL_TOKEN,
        },
        data: {
          method: 'native',
          mobileNumber: code,
        },
      });

      if (response.data.token) {
        wx.setStorageSync('vendure_token', response.data.token);
        this.globalData.token = response.data.token;
        return response.data;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return null;
    }
  },

  setCartItems(items) {
    this.globalData.cartItems = items;
    wx.setStorageSync('cart_items', items);
  },

  getCartItems() {
    if (this.globalData.cartItems.length === 0) {
      this.globalData.cartItems = wx.getStorageSync('cart_items') || [];
    }
    return this.globalData.cartItems;
  },

  addToCart(product, quantity = 1) {
    const cartItems = this.getCartItems();
    const existIndex = cartItems.findIndex(
      item => item.variantId === product.variantId
    );

    if (existIndex > -1) {
      cartItems[existIndex].quantity += quantity;
    } else {
      cartItems.push({
        ...product,
        quantity,
        selected: true,
      });
    }

    this.setCartItems(cartItems);
    return cartItems;
  },

  updateCartItemQuantity(variantId, quantity) {
    const cartItems = this.getCartItems();
    const index = cartItems.findIndex(item => item.variantId === variantId);

    if (index > -1) {
      if (quantity <= 0) {
        cartItems.splice(index, 1);
      } else {
        cartItems[index].quantity = quantity;
      }
      this.setCartItems(cartItems);
    }

    return cartItems;
  },

  removeFromCart(variantId) {
    return this.updateCartItemQuantity(variantId, 0);
  },

  clearCart() {
    this.setCartItems([]);
  },

  getCartTotal() {
    const cartItems = this.getCartItems();
    return cartItems
      .filter(item => item.selected)
      .reduce((total, item) => {
        return total + (item.price * item.quantity);
      }, 0);
  },

  getCartCount() {
    const cartItems = this.getCartItems();
    return cartItems.reduce((count, item) => {
      return count + (item.selected ? item.quantity : 0);
    }, 0);
  },
});
