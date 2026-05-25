const config = require('./config.js');

App({

  globalData: {

    activeChannelToken: "",

    userInfo: null,
    openid: '',
    token: '',
    cartItems: [],
    customerInfo: null,
    baseUrl: config.baseUrl,
    isLogin: false,
    windowHeight: 0,
    windowWidth: 0

  },

  // 暴露给所有 Page 的全局登录凭证 Promise
  loginPromise: null,
  // 暴露给所有 Page 的全局初始化 Promise (包含渠道 token)
  initPromise: null,

  async onLaunch(options) {
    // 立即创建 initPromise (确保页面不会访问 undefined)
    let resolveInitPromise;
    this.initPromise = new Promise(resolve => {
      resolveInitPromise = resolve;
    });

    // 2026-05-23 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    console.log("2026-05-23 ======= 微信的参数：", options.query);

    // 1. 安全获取渠道 code
    let channelCode = "__default_channel__";
    if (options && options.query && options.query.channel) {
      channelCode = options.query.channel;
    }

    // 2. 读取本地缓存（如果有）
    const localChannel = wx.getStorageSync("LAST_CHANNEL");
    if (localChannel && !options.query.channel) {
      channelCode = localChannel;
    }

    // 3. 调用你自定义的接口，安全获取当前渠道 token
    await this.getChannelToken(channelCode);

    console.log("最终使用渠道：", channelCode);
    console.log("最终使用 token：", this.globalData.activeChannelToken);

    // 2026-05-23 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

    // 1. 初始化渠道基础配置
    this.initChannel();

    // 2. 获取屏幕尺寸
    this.getSystemInfo();

    // 3. 异步初始化云开发环境（不阻塞主登录流程）
    this.initCloud();

    // 4. 初始化购物车徽章（即使未登录也显示本地购物车数量）
    this.initCartBadge();

    // 5. 🔥 启动核心身份鉴权控制流，并挂载到全局 Promise
    this.loginPromise = this.initAuthFlow().then(() => {
      // 登录完成后同步服务器购物车数量
      if (this.globalData.isLogin) {
        this.syncServerCartCount();
      }
    });

    // 全局初始化完成 (渠道 token 已获取)，resolve initPromise
    resolveInitPromise();
  },

  /*** 2026-05-23 Channel Token */

  // ==============================================
  // 👇 调用你自己的 API：getChannelTokenByCode
  // ==============================================
  async getChannelToken(code) {
    return new Promise((resolve) => {
      wx.request({
        url: `${config.production.API_URL}`,
        method: "POST",
        header: {
          "Content-Type": "application/json",
        },
        // 👇 直接用你给的 VSCode 查询！！！
        data: {
          query: `
            query TestChannelLookup($code: String!) {
              getChannelTokenByCode(code: $code) {
                id
                code
                token
              }
            }
          `,
          variables: {
            code: code
          }
        },
        success: (res) => {
          console.log("返回数据：", res.data);

          try {
            const token = res.data.data.getChannelTokenByCode.token;
            this.globalData.activeChannelToken = token;
            wx.setStorageSync("LAST_CHANNEL", code);
          } catch (e) {
            console.error("获取渠道失败");
          }

          resolve();
        },
        fail: () => {
          resolve();
        },
      });
    });
  },



  /*** 2026-05-23 Channel Token */

  /*** 核心身份鉴权控制流 */
  async initAuthFlow() {
    const token = wx.getStorageSync('vendure-auth-token');

    // ---- 步骤 1：本地有 Token，优先验证有效性 ----
    if (token) {
      console.log('【步骤 1】本地发现旧 Token，正在向后端验证有效性...');
      const isValid = await this.verifyToken(token);

      if (isValid) {
        console.log('【步骤 1-成功】Token 依然有效，老用户免密进入首页');
        this.setLoginStatus(true);
        return {
          isLogin: true,
          openid: wx.getStorageSync('openid')
        };
      }

      console.log('【步骤 1-失效】Token 已失效或过期，清理旧缓存，准备走 OpenID 检查机制');
      wx.removeStorageSync('vendure-auth-token');
    }

    // ---- 步骤 2：获取微信用户的 OpenID ----
    console.log('【步骤 2】开始获取用户的微信 OpenID...');
    const openid = await this.getWechatOpenId();

    if (!openid) {
      console.error('【步骤 2-异常】未拉取到有效的 OpenID，无法判定注册状态');
      this.globalData.isLogin = false;
      return {
        isLogin: false
      };
    }

    // ---- 步骤 3：提交给 Vendure 校验是否注册 ----
    console.log('【步骤 3】已取得 OpenID，正在请求 Vendure 校验数据库中的注册状态...');
    const isRegisteredUser = await this.checkAndLoginWithVendure(openid);

    if (isRegisteredUser) {
      console.log('【步骤 3-A】该用户已注册过，静默登录成功，Token 刷新。');
      this.setLoginStatus(true);
      return {
        isLogin: true,
        openid
      };
    } else {
      console.log('【步骤 3-B】该用户在系统中尚未创建账号 ➡️ 判定为【未注册新用户】');
      this.setLoginStatus(false);
      return {
        isLogin: false,
        openid
      };
    }
  },

  /*** 验证本地存储的令牌 */
  verifyToken(token) {
    return new Promise((resolve) => {
      wx.request({
        url: this.globalData.baseUrl,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token}`,
          'vendure-token': this.globalData.activeChannelToken
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
          resolve(!!me); // me 有数据返回 true，没有（或者为null）则返回 false
        },
        fail: () => {
          console.error('网络校验请求失败，默认 Token 失效');
          resolve(false);
        }
      });
    });
  },

  /*** 通过 FastAPI 或者缓存获取用户 OpenID */
  getWechatOpenId() {
    return new Promise((resolve) => {
      // 优先读取本地持久化缓存
      let myOpenId = wx.getStorageSync("openid");
      if (myOpenId) {
        this.globalData.openid = myOpenId;
        console.log("【OpenID】从本地 Storage 读取成功");
        return resolve(myOpenId);
      }

      // 本地没有，执行原生微信登录换取
      wx.login({
        success: (res) => {
          if (res.code) {
            console.log("微信临时登录凭证 code 换取成功:", res.code);
            wx.request({
              url: `${config.fastapiUrl}/api/checkYcgpLoginStatus`,
              method: 'POST',
              data: {
                code: res.code
              },
              success: (backendRes) => {
                const fetchedOpenid = backendRes.data?.openid;
                if (fetchedOpenid) {
                  wx.setStorageSync('openid', fetchedOpenid);
                  this.globalData.openid = fetchedOpenid;

                  // 同步尝试获取用户的授权配置
                  wx.getSetting({
                    success: (settingRes) => {
                      this.globalData.userInfo = settingRes.authSetting;
                    }
                  });
                  resolve(fetchedOpenid);
                } else {
                  resolve(null);
                }
              },
              fail: (err) => {
                console.error('FastAPI 换取 Openid 接口网络请求失败:', err);
                resolve(null);
              }
            });
          } else {
            console.error('微信原生 wx.login 失败:', res.errMsg);
            resolve(null);
          }
        },
        fail: () => resolve(null)
      });
    });
  },

  /*** 向 Vendure 发起不带注册权限的静默登录校验 */
  checkAndLoginWithVendure(openid) {
    return new Promise((resolve) => {
      wx.request({
        url: this.globalData.baseUrl,
        method: 'POST',
        header: {
          'vendure-token': this.globalData.activeChannelToken
        },
        data: {
          query: `
            mutation CheckOrLogin($openId: String!) {
              authenticate(input: { wechat: { openId: $openId } }) {
                __typename
                ... on CurrentUser {
                  id
                }
                ... on InvalidCredentialsError {
                  errorCode
                  message
                }
              }
            }
          `,
          variables: {
            openId: openid
          }
        },
        success: (res) => {
          const authData = res.data?.data?.authenticate;
          const typeName = authData?.__typename;

          if (typeName === 'InvalidCredentialsError') {
            // 捕获到后端策略由于没有设置 signUp 抛出的凭证失效错误，确认为未注册
            resolve(false);
          } else if (typeName === 'CurrentUser' && authData?.id) {
            // 已有账号，登录成功，提取 Response Headers 里的全新 Vendure Token
            const token = res.header['vendure-auth-token'] || res.header['Vendure-Auth-Token'];
            if (token) {
              wx.setStorageSync('vendure-auth-token', token);
              resolve(true);
            } else {
              console.error('已通过鉴权，但 Response Header 中无 vendure-auth-token');
              resolve(false);
            }
          } else {
            resolve(false);
          }
        },
        fail: () => {
          console.error('请求 Vendure 身份校验网关故障');
          resolve(false);
        }
      });
    });
  },

  // ~~~~~~~~~~~ 系统工具初始化模块 ~~~~~~~~~~~

  initChannel() {
    this.channelToken = config.CHANNEL_TOKEN;
  },

  initCloud() {
    try {
      const mycloud = new wx.cloud.Cloud({
        resourceAppid: config.cloudAppId,
        resourceEnv: config.cloudEnvId
      });

      mycloud.init().then(() => {
        console.log('共享云环境初始化成功 ✔');
      }).catch(err => {
        console.error('初始化共享云失败 ❌', err);
      });

      this.cloud = mycloud;
    } catch (e) {
      console.error('云开发模块发生异常', e);
    }
  },

  getSystemInfo() {
    try {
      const windowInfo = wx.getWindowInfo();
      this.globalData.windowHeight = windowInfo.windowHeight;
      this.globalData.windowWidth = windowInfo.windowWidth;
    } catch (e) {
      console.error('获取设备屏幕尺寸失败', e);
    }
  },

  // async login(code) {
  //   try {
  //     const response = await wx.request({
  //       url: `${config.production.API_URL}/auth/authentication`,
  //       method: 'POST',
  //       header: {
  //         'Content-Type': 'application/json',
  //         'vendure-token': config.CHANNEL_TOKEN,
  //       },
  //       data: {
  //         method: 'native',
  //         mobileNumber: code,
  //       },
  //     });

  //     if (response.data.token) {
  //       wx.setStorageSync('vendure_token', response.data.token);
  //       this.globalData.token = response.data.token;
  //       return response.data;
  //     }
  //   } catch (error) {
  //     console.error('Native login failed:', error);
  //     return null;
  //   }
  // },

  // ~~~~~~~~~~~~~~~~~~~~ 购物车核心数据驱动方法 ~~~~~~~~~~~~~~~~~~~~

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

  addItemToLocalCart(product, quantity = 1) {
    return this.addToCart(product, quantity);
  },

  async addItemToServerCart(variantId, quantity = 1) {
    const {
      graphqlClient
    } = require('./utils/api.js');

    const mutation = `
      mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
        addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
          ... on Order {
            id
            state
            totalQuantity
          }
          ... on OrderLimitError {
            message
          }
          ... on InsufficientStockError {
            message
          }
        }
      }
    `;

    const result = await graphqlClient.mutate(mutation, {
      productVariantId: variantId,
      quantity: quantity,
    });

    if (result.addItemToOrder.message) {
      throw new Error(result.addItemToOrder.message);
    }

    return result.addItemToOrder;
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
    return cartItems.length; // Count number of distinct items, not total quantity
  },

  initCartBadge() {
    const localItems = wx.getStorageSync('cart_items') || [];
    const localCount = localItems.length; // Count number of distinct items, not total quantity

    console.log('initCartBadge - 本地购物车数量:', localCount);

    if (localCount > 0) {
      wx.setTabBarBadge({
        index: 3,
        text: String(localCount),
      });
    }
  },

  updateCartBadge() {
    const cartCount = this.globalData.cartTotalCount || this.getCartCount();
    console.log('updateCartBadge - cartCount:', cartCount);
    if (cartCount > 0) {
      wx.setTabBarBadge({
        index: 3,
        text: String(cartCount),
      });
    } else {
      wx.removeTabBarBadge({
        index: 3,
      });
    }
  },

  async syncServerCartCount() {
    if (!this.globalData.isLogin) return;

    try {
      const {
        graphqlClient
      } = require('./utils/api.js');
      const query = `
        query GetActiveOrder {
          activeOrder {
            lines {
              id
            }
          }
        }
      `;
      const data = await graphqlClient.query(query);
      console.log('syncServerCartCount - data:', data);
      if (data?.activeOrder?.lines) {
        this.globalData.cartTotalCount = data.activeOrder.lines.length; // Count number of distinct items
        this.updateCartBadge();
      } else {
        this.globalData.cartTotalCount = 0;
        this.updateCartBadge();
      }
    } catch (error) {
      console.error('同步服务器购物车数量失败:', error);
    }
  },

  async mergeLocalCartToServer() {
    if (!this.globalData.isLogin) {
      console.log('mergeLocalCartToServer - 用户未登录，跳过合并');
      return;
    }

    const localItems = wx.getStorageSync('cart_items') || [];
    if (localItems.length === 0) {
      console.log('mergeLocalCartToServer - 本地购物车为空，无需合并');
      return;
    }

    console.log(`mergeLocalCartToServer - 开始合并 ${localItems.length} 个本地商品到服务器`);

    try {
      const {
        graphqlClient
      } = require('./utils/api.js');

      for (const item of localItems) {
        const mutation = `
          mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
            addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
              __typename
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
        await graphqlClient.mutate(mutation, {
          productVariantId: item.variantId,
          quantity: item.quantity,
        });
        console.log(`mergeLocalCartToServer - 已合并商品: ${item.variantId}`);
      }

      wx.removeStorageSync('cart_items');
      this.globalData.cartItems = [];

      await this.syncServerCartCount();
      console.log('mergeLocalCartToServer - 合并完成');
    } catch (error) {
      console.error('mergeLocalCartToServer - 合并失败:', error);
    }
  },

  setLoginStatus(isLogin) {
    const previousStatus = this.globalData.isLogin;
    this.globalData.isLogin = isLogin;

    if (isLogin && !previousStatus) {
      console.log('setLoginStatus - 登录状态从 false 变为 true，开始合并购物车');
      setTimeout(() => {
        this.mergeLocalCartToServer();
      }, 100);
    } else if (!isLogin && previousStatus) {
      console.log('setLoginStatus - 登录状态从 true 变为 false，显示本地购物车数量');
      this.initCartBadge();
    }
  },
});
