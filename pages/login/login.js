const app = getApp();
const { auth } = require('../../utils/auth.js');
const { request } = require('../../utils/request.js');

Page({
  data: {
    phone: '',
    code: '',
    countdown: 0,
    agreed: false,
    canLogin: false,
  },

  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value,
    });
    this.updateCanLogin();
  },

  onCodeInput(e) {
    this.setData({
      code: e.detail.value,
    });
    this.updateCanLogin();
  },

  onAgreementChange(e) {
    const agreed = e.detail.value.includes('agree');
    this.setData({
      agreed,
    });
    this.updateCanLogin();
  },

  updateCanLogin() {
    const canLogin = this.data.agreed &&
      this.data.phone.length === 11 &&
      this.data.code.length >= 4;
    this.setData({
      canLogin,
    });
  },

  onSendCode() {
    if (!this.data.phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none',
      });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(this.data.phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none',
      });
      return;
    }

    this.setData({ countdown: 60 });

    const timer = setInterval(() => {
      if (this.data.countdown > 0) {
        this.setData({
          countdown: this.data.countdown - 1,
        });
      } else {
        clearInterval(timer);
      }
    }, 1000);

    wx.showToast({
      title: '验证码已发送',
      icon: 'success',
    });
  },

  async onLogin() {
    if (!this.data.agreed) {
      wx.showToast({
        title: '请同意用户协议',
        icon: 'none',
      });
      return;
    }

    if (!this.data.phone || !this.data.code) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
      });
      return;
    }

    wx.showLoading({ title: '登录中...' });

    try {
      const result = await request.post('/auth/authentication', {
        method: 'mobile',
        phoneNumber: this.data.phone,
        code: this.data.code,
      });

      if (result.token) {
        auth.setToken(result.token);

        if (result.customer) {
          auth.setCustomerInfo(result.customer);
        }

        wx.showToast({
          title: '登录成功',
          icon: 'success',
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('Login failed:', error);
      wx.showToast({
        title: '登录失败',
        icon: 'none',
      });
    } finally {
      wx.hideLoading();
    }
  },

  onWechatLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          console.log('Wechat login code:', res.code);
          wx.showToast({
            title: '微信登录开发中',
            icon: 'none',
          });
        }
      },
    });
  },

  showAgreement() {
    wx.navigateTo({
      url: '/pages/userAgreement/userAgreement',
    });
  },

  showPrivacy() {
    wx.navigateTo({
      url: '/pages/privacyPolicy/privacyPolicy',
    });
  },
});
