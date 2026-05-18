const config = require('../config.js');

class Request {
  constructor() {
    this.baseURL = config.development.API_URL;
    this.timeout = 10000;
  }

  getHeaders(token = '') {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async request(options) {
    const {
      url,
      method = 'GET',
      data = {},
      header = {},
      token = '',
    } = options;

    try {
      const response = await wx.request({
        url: this.baseURL + url,
        method,
        data,
        header: {
          ...this.getHeaders(token),
          ...header,
        },
        timeout: this.timeout,
      });

      if (response.statusCode === 200) {
        return response.data;
      } else if (response.statusCode === 401) {
        wx.removeStorageSync('vendure_token');
        wx.removeStorageSync('customer_info');
        wx.navigateTo({
          url: '/pages/login/login',
        });
        throw new Error('Unauthorized');
      } else {
        throw new Error(`Request failed: ${response.statusCode}`);
      }
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  async get(url, data = {}, token = '') {
    return this.request({
      url,
      method: 'GET',
      data,
      token,
    });
  }

  async post(url, data = {}, token = '') {
    return this.request({
      url,
      method: 'POST',
      data,
      token,
    });
  }

  async put(url, data = {}, token = '') {
    return this.request({
      url,
      method: 'PUT',
      data,
      token,
    });
  }

  async delete(url, data = {}, token = '') {
    return this.request({
      url,
      method: 'DELETE',
      data,
      token,
    });
  }
}

const request = new Request();

module.exports = {
  request,
  Request,
};
