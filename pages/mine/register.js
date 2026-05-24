const app = getApp();
const config = require('../../config.js');

Page({
  data: {
    isAgreed: false, // 微信审核要求
    fastapiUrl: config.fastapiUrl,
    userOpenId: '',
    userAvatarUrl: config.avatarImg,
    userNickName: '',
    userName: '',
    userMobile: '',
    userMobileColor: '#707070', 
    hasUserInfo: false
  },

  checkboxChange(e) {
    this.setData({
      isAgreed: e.detail.value.length > 0
    });
  },

  async onLoad() {
    const openid = app.globalData.openid || wx.getStorageSync('openid');
    this.setData({ userOpenId: openid });

    // 初始化载入已有缓存
    const avatarurl = wx.getStorageSync('avatarurl');
    const nickname = wx.getStorageSync('nickname');
    const mobile = wx.getStorageSync('mobile');
    const userName = wx.getStorageSync('userName');

    if (openid) this.setData({ userOpenId: openid });
    if (avatarurl && avatarurl !== `${config.avatarImg}`) this.setData({ userAvatarUrl: avatarurl });
    if (nickname) this.setData({ userNickName: nickname });
    if (mobile) this.setData({ userMobile: mobile });
    if (userName) this.setData({ userName: userName });
  },

  /**
   * 提交表单主控制流
   */
  async bindSubmit() {
    const { userOpenId, userAvatarUrl, userNickName, userMobile, userName, isAgreed } = this.data;

    if (!isAgreed) {
      return wx.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' });
    }

    if (userAvatarUrl === `${config.avatarImg}` || !userNickName || !userMobile || !userName) {
      return wx.showToast({ title: '请填写必要信息', icon: 'none', duration: 2500 });
    }

    // ⏳ 开启全局统一的 Loading
    wx.showLoading({ title: '正在提交中...', mask: true });

    try {
      if (!app.globalData.isLogin) {
        // 🔥 情况 A：新用户注册 ➡️ 发起开户
        console.log('【开户】检测到电商未注册状态，发起 Vendure 注册流程...');
        const result = await this.registerToVendure(userOpenId, userNickName, userName, userMobile);
        
        if (!result.success) {
          wx.hideLoading(); // 👈 必须在 showToast 之前关闭 Loading
          wx.showToast({ title: result.message || '开户失败', icon: 'none' });
          return;
        }
      } else {
        // 🔥 情况 B：老用户更新 ➡️ 修复 400 错误后的标准更新接口
        console.log('【更新】检测到老用户状态，正在同步修改至 Vendure 系统...');
        const result = await this.updateToVendure(userNickName, userName, userMobile);
        
        if (!result.success) {
          wx.hideLoading(); // 👈 必须在 showToast 之前关闭 Loading
          wx.showToast({ title: result.message || '更新资料失败', icon: 'none' });
          return;
        }
      }

      // 💾 两端下沉同步：核心电商系统成功后，同步写入微信云数据库
      await this.cloudDbWrite(userOpenId, userAvatarUrl, userNickName, userMobile, userName);

      // 固化本地缓存
      wx.setStorageSync('avatarurl', userAvatarUrl);
      wx.setStorageSync('nickname', userNickName);
      wx.setStorageSync('mobile', userMobile);
      wx.setStorageSync('userName', userName);

      // ✔ 流程完美结束，关闭 Loading 并提示成功
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 2000,
        complete: () => {
          setTimeout(() => {
            wx.switchTab({ url: '/pages/mine/mine' });
          }, 2000);
        }
      });

    } catch (error) {
      console.error('表单提交综合控制流异常:', error);
      wx.hideLoading();
      wx.showToast({ title: '服务暂不可用，请重试', icon: 'none' });
    }
  },

  /**
   * 纯净逻辑 A：向 Vendure 发起全新微信开户注册
   */
  registerToVendure(openId, nickname, lastName, phone) {
    return new Promise((resolve) => {
      wx.request({
        url: app.globalData.baseUrl,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          // 👇 核心修复：带上当前活跃渠道的 Token！
          // 这样 Vendure 后台创建出来的用户就会直接归属于该子渠道，实现隔离！
          'vendure-token': app.globalData.activeChannelToken || '' 
        },
        data: {
          query: `
            mutation DoRegister($openId: String!, $nickname: String, $lastName: String, $phone: String) {
              authenticate(input: {
                wechat: {
                  openId: $openId,
                  nickname: $nickname,
                  lastName: $lastName,
                  phoneNumber: $phone,
                  signUp: true
                }
              }) {
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
          variables: { openId, nickname, lastName, phone }
        },
        success: (res) => {
          if (res.data?.errors && res.data.errors.length > 0) {
            resolve({ success: false, message: res.data.errors[0].message });
            return;
          }
          const authData = res.data?.data?.authenticate;
          if (authData?.__typename === 'CurrentUser') {
            const token = res.header['vendure-auth-token'] || res.header['Vendure-Auth-Token'];
            if (token) {
              wx.setStorageSync('vendure-auth-token', token);
              app.setLoginStatus(true);
              resolve({ success: true });
            } else {
              resolve({ success: false, message: '未获取到系统安全令牌' });
            }
          } else {
            resolve({ success: false, message: authData?.message || '注册认证失败' });
          }
        },
        fail: () => resolve({ success: false, message: '无法连接核心电商服务器' })
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
            resolve({ success: false, message: res.data.errors[0].message });
            return;
          }

          const customer = res.data?.data?.updateCustomer;
          if (customer && customer.id) {
            console.log('【Vendure】客户电商数据同步成功 ✔');
            resolve({ success: true });
          } else {
            resolve({ success: false, message: '核心系统拒绝了本次修改' });
          }
        },
        fail: () => resolve({ success: false, message: '核心网络连接失败，未同步' })
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
        return userCollection.doc(docId).update({ data: dataPayload });
      } else {
        return userCollection.add({ data: dataPayload });
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
    wx.showLoading({ title: '头像上传中...' });

    app.cloud.uploadFile({
      cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
      filePath: avatarUrl,
      success: res => {
        const fileID = res.fileID;
        app.cloud.getTempFileURL({
          fileList: [fileID],
          success: res => {
            const tempFileURL = res.fileList[0].tempFileURL;
            this.setData({ userAvatarUrl: tempFileURL });
            wx.hideLoading();
          },
          fail: err => {
            console.error(err);
            wx.hideLoading();
          }
        });
      },
      fail: err => {
        console.error(err);
        wx.hideLoading();
      }
    });
  },

  onNickNameInputChange(e) {
    this.setData({ "userNickName": e.detail.value });
  },

  onUserNameInputChange(e) {
    this.setData({ "userName": e.detail.value });
  },

  onUserMobileInputChange(e) {
    this.setData({ "userMobile": e.detail.value });
  }
});