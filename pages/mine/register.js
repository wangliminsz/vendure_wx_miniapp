const app = getApp();
const config = require('../../config.js');

Page({
  data: {
    isAgreed: false,
    fastapiUrl: config.fastapiUrl,
    userOpenId: '',
    userAvatarUrl: config.avatarImg || "/static/images/get_avatar.png",
    userNickName: '',
    userName: '',
    userMobile: '',
    userMobileColor: '#707070',
    hasUserInfo: false,
    verifyCode: '',
    isLogin: false
  },

  checkboxChange(e) {
    this.setData({
      isAgreed: (e.detail.value && e.detail.value.length > 0)
    });
  },

  async onLoad() {

    // 安全检查全局数据
    if (!app.globalData) {
      console.error('app.globalData is null or undefined');
      app.globalData = {};
    }
    if (!app.globalData.openid && !wx.getStorageSync('openid')) {
      console.warn('openid not found');
    }

    // console.log('config.avatarImg:', config.avatarImg); // 检查这个值
    // console.log('typeof config.avatarImg:', typeof config.avatarImg)

    const openid = app.globalData.openid || wx.getStorageSync('openid');
    this.setData({
      userOpenId: openid
    });

    // 初始化载入已有缓存 - 添加安全判断
    const avatarurl = wx.getStorageSync('avatarurl') || '';
    const nickname = wx.getStorageSync('nickname') || '';
    const mobile = wx.getStorageSync('mobile') || '';
    const userName = wx.getStorageSync('userName') || '';

    if (openid) this.setData({
      userOpenId: openid
    });
    // 确保 avatarurl 有效
    if (avatarurl && avatarurl !== config.avatarImg && avatarurl !== 'null' && avatarurl !== 'undefined') {
      this.setData({
        userAvatarUrl: avatarurl
      });
    } else {
      this.setData({
        userAvatarUrl: config.avatarImg || "/static/images/get_avatar.png"
      });
    }
    if (nickname) this.setData({
      userNickName: nickname
    });
    if (mobile) this.setData({
      userMobile: mobile
    });
    if (userName) this.setData({
      userName: userName
    });

    this.setData({
      isLogin: app.globalData.isLogin || false
    });
  },


  async submitForm() {
    // 1. 基础合规检查
    if (!this.data.isAgreed) {
      wx.showToast({
        title: '请先勾选并同意用户协议',
        icon: 'none'
      });
      return;
    }

    if (!this.data.userMobile) {
      wx.showToast({
        title: '请填写手机号码',
        icon: 'none'
      });
      return;
    }
    if (!this.data.userName) {
      wx.showToast({
        title: '请填写姓名',
        icon: 'none'
      });
      return;
    }

    if (!this.data.isLogin) {
      if (!this.data.verifyCode || this.data.verifyCode.length !== 4) {
        wx.showToast({
          title: '请输入4位有效的渠道校验码',
          icon: 'none'
        });
        return;
      }
    }

    wx.showLoading({
      title: this.data.isLogin ? '正在更新信息...' : '正在激活安全授信...',
      mask: true
    });

    const openId = this.data.userOpenId || wx.getStorageSync('openid');
    const verifyCode = this.data.verifyCode.toUpperCase().trim();
    const nickname = this.data.userNickName || '微信用户';
    const lastName = this.data.userName;
    const phone = this.data.userMobile;
    const avatarUrl = this.data.userAvatarUrl || '/static/images/get_avatar.png';

    try {
      if (this.data.isLogin) {
        console.log('【更新】检测到老用户状态，正在同步修改至 Vendure 系统...');
        const updateRes = await this.updateToVendure(nickname, lastName, phone);

        if (!updateRes.success) {
          wx.hideLoading();
          wx.showModal({
            title: '更新失败',
            content: updateRes.message || '更新资料失败',
            showCancel: false
          });
          return;
        }
      } else {
        console.log('【开户】检测到电商未注册状态，发起 Vendure 注册流程...');
        const loginRes = await this.registerToVendureWithCode(openId, verifyCode, nickname, lastName, phone);

        if (!loginRes.success) {
          wx.hideLoading();
          wx.showModal({
            title: '激活失败',
            content: loginRes.message || '授信码无效或已被使用',
            showCancel: false
          });
          return;
        }
      }

      await this.cloudDbWrite(openId, avatarUrl, nickname, phone, lastName);

      wx.hideLoading();

      wx.showToast({
        title: this.data.isLogin ? '更新成功' : '激活并登录成功',
        icon: 'success',
        duration: 2000
      });

      wx.setStorageSync('nickname', nickname);
      wx.setStorageSync('mobile', phone);
      wx.setStorageSync('avatarurl', avatarUrl);
      wx.setStorageSync('userName', lastName);

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/mine/mine'
        });
      }, 1500);

    } catch (err) {
      wx.hideLoading();
      console.error('【严重异常】注册/更新动作崩溃:', err);
      wx.showToast({
        title: '服务器开小差了，请重试',
        icon: 'none'
      });
    }
  },






  /**
   * 🟢 纯净逻辑 A（全面改造升级）：通过授权激活码发起微信开户注册
   * 适用场景：用户填了4位激活码，点击“提交激活并注册”
   */
  registerToVendureWithCode(openId, verifyCode, nickname, lastName, phone) {
    return new Promise((resolve) => {
      wx.request({
        url: app.globalData.baseUrl,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'vendure-token': app.globalData.activeChannelToken || '' // 确保拿到对应渠道上下文
        },
        data: {
          // 🎯 调用新解耦的核销注册 Mutation
          query: `
            mutation DoAuthRegister($openId: String!, $verifyCode: String!, $nickname: String, $lastName: String, $phone: String) {
              registerWithAuthCode(
                openId: $openId,
                verifyCode: $verifyCode,
                nickname: $nickname,
                lastName: $lastName,
                phoneNumber: $phone
              ) {
                id
                identifier
              }
            }
          `,
          variables: {
            openId: openId,
            verifyCode: verifyCode.toUpperCase().trim(), // 强转大写防错
            nickname: nickname,
            lastName: lastName,
            phone: phone
          }
        },
        success: (res) => {
          // 1. 捕获后端安全墙拦截（如：授权码无效、已被使用、渠道不匹配）
          if (res.data?.errors && res.data.errors.length > 0) {
            console.error('【安全注册拦截】---->', res.data.errors);
            const errorMessage = res.data.errors[0].message;
            // 检测重复键错误，显示友好提示
            let displayMessage = errorMessage;
            if (errorMessage && (errorMessage.includes('duplicate key') || errorMessage.includes('唯一约束'))) {
              displayMessage = '请解除其它渠道绑定...';
            }
            resolve({
              success: false,
              message: displayMessage
            });
            return;
          }

          const
            userData = res.data?.data?.registerWithAuthCode;
          if (userData && userData.id) {
            console.log('【渠道授信注册成功】，User ID:', userData.id);

            // 🚀【核心闭环关键点】：注册成功后，不干扰用户，自动在这里“打回马枪”进行静默登录
            this.loginToVendureSilent(openId).then(loginRes => {
              resolve(loginRes);
              // 返回最终的登录会话结果
            });

          } else {
            resolve({
              success: false,
              message: '核心系统拒绝了本次开户申请'
            });
          }
        },
        fail: () => resolve({
          success: false,
          message: '无法连接核心电商服务器'
        })
      });
    });
  },

  /**
   * 🟢 纯净逻辑 A-2（新增辅助）：静默登录接口（不允许新用户注册，只给老用户发Token）
   * 适用场景：1. 首页自动登录； 2. 上面注册成功后的后续收尾
   */
  loginToVendureSilent(openId) {
    return new Promise((resolve) => {
      wx.request({
        url: app.globalData.baseUrl,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'vendure-token': app.globalData.activeChannelToken || ''
        },
        data: {
          query: `
            mutation DoSilentLogin($openId: String!) {
              authenticate(input: {
                wechat: {
                  openId: $openId,
                  signUp: false # 🔒 绝对死锁：此处绝不发放新用户资格，全靠 Strategy 的拦截保护！
                }
              }) {
                __typename
                ... on CurrentUser { id }
              }
            }
          `,
          variables: {
            openId
          }
        },
        success: (res) => {
          const
            authData = res.data?.data?.authenticate;
          if (authData?.__typename === 'CurrentUser') {
            const token = res.header['vendure-auth-token'] || res.header['Vendure-Auth-Token'];
            if (token) {
              wx.setStorageSync(
                'vendure-auth-token', token);
              app.setLoginStatus(
                true
              );
              resolve({
                success: true
              });
              return;
            }
          }

          // 如果未落户的用户尝试走这里，wechat-auth.strategy 就会直接抛出 'NOT_REGISTERED'
          resolve({
            success: false,
            message: '尚未获得系统授权，请获取激活码'
          });
        },
        fail: () => resolve({
          success: false,
          message: '网络连接失败'
        })
      });
    });
  },




  /**
   * 纯净逻辑 B：老用户修改核心资料（🔥 已修复 400 Bad Request 语法）
   */
  updateToVendure(nickname, lastName, phone) {
    const token = wx.getStorageSync('vendure-auth-token');
    return new Promise((resolve) => {
      wx.request({
        url: app.globalData.baseUrl,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token}`,
          'vendure-token': app.globalData.activeChannelToken || ''
        },
        data: {
          query: `
            mutation UpdateCustomerInfo($firstName: String, $lastName: String, $phone: String) {
              updateCustomer(input: {
                firstName: $firstName,
                lastName: $lastName,
                phoneNumber: $phone
              }) {
                id # 👈 🔥 关键：直接请求底层对象的属性，剔除不合法的 ... on ErrorResult
              }
            }
          `,
          variables: {
            firstName: nickname,
            lastName: lastName,
            phone: phone
          }
        },
        success: (res) => {
          // 捕获 GraphQL 内部业务错误 (例如手机号格式不正确等)
          if (res.data?.errors && res.data.errors.length > 0) {
            console.error('【Vendure 内部拦截】:', res.data.errors);
            resolve({
              success: false,
              message: res.data.errors[0].message
            });
            return;
          }

          const customer = res.data?.data?.updateCustomer;
          if (customer && customer.id) {
            console.log('【Vendure】客户电商数据同步成功 ✔');
            resolve({
              success: true
            });
          } else {
            resolve({
              success: false,
              message: '核心系统拒绝了本次修改'
            });
          }
        },
        fail: () => resolve({
          success: false,
          message: '核心网络连接失败，未同步'
        })
      });
    });
  },

  /**
   * 微信云开发数据库同步下沉
   */
  cloudDbWrite(userOpenId, userAvatarUrl, userNickName, userMobile, userName) {
    if (!app.cloud) {
      console.error('Cloud is not initialized');
      return Promise.resolve(null);
    }

    const db = app.cloud.database();
    const userCollection = db.collection('user');

    return userCollection.where({
      openid: userOpenId
    }).get().then(res => {
      const dataPayload = {
        avatarurl: userAvatarUrl,
        nickname: userNickName,
        mobile: userMobile,
        userName: userName,
        openid: userOpenId
      };

      if (res.data.length > 0) {
        const docId = res.data[0]._id;
        return userCollection.doc(docId).update({
          data: dataPayload
        });
      } else {
        return userCollection.add({
          data: dataPayload
        });
      }
    });
  },

  // ~~~~~~~~~~~~~~~~~~~~ 头像及输入框组件双向驱动 ~~~~~~~~~~~~~~~~~~~~

  onChooseAvatar(e) {
    if (!app.cloud) return;
    const avatarurl = e.detail.avatarUrl;
    this.uploadAvatarToCloud(avatarurl);
  },

  uploadAvatarToCloud(avatarUrl) {
    if (!app.cloud) return;
    wx.showLoading({
      title: '头像上传中...'
    });

    app.cloud.uploadFile({
      cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
      filePath: avatarUrl,
      success: res => {
        const fileID = res.fileID;
        app.cloud.getTempFileURL({
          fileList: [fileID],
          success: res => {
            const tempFileURL = res.fileList[0].tempFileURL;
            this.setData({
              userAvatarUrl: tempFileURL
            });
            wx.hideLoading();
          },
          fail: err => {
            // console.error(err);
            wx.hideLoading();
          }
        });
      },
      fail: err => {
        // console.error(err);
        wx.hideLoading();
      }
    });
  },

  onNickNameInputChange(e) {
    this.setData({
      "userNickName": e.detail.value
    });
  },

  onUserNameInputChange(e) {
    this.setData({
      "userName": e.detail.value
    });
  },

  onUserMobileInputChange(e) {
    this.setData({
      "userMobile": e.detail.value
    });
  },

  onVerifyCodeInputChange(e) {
    this.setData({
      "verifyCode": e.detail.value.toUpperCase()
    });
  }
});