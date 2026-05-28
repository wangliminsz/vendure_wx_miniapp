const config = require('../config.js');
const app = getApp();

class GraphQLClient {
  constructor() {
    this.apiUrl = config.development.API_URL;
    this.authToken = '';
  }

  getHeaders(token = '') {
    const headers = {
      'Content-Type': 'application/json',
    };

    const authToken = token || this.authToken || wx.getStorageSync('vendure-auth-token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const channelToken = app.globalData.activeChannelToken;
    if (channelToken) {
      // console.log ('--------------vendure-token in homepage=', channelToken )
      // console.log ('--------------vendure-token in homepage=', channelToken)
      headers['vendure-token'] = channelToken;
    }

    return headers;
  }

  async request(query, variables = {}, token = '') {
    let queryString = query;
    if (typeof query === 'object' && query.loc && query.loc.source.body) {
      queryString = query.loc.source.body;
    } else if (typeof query !== 'string') {
      queryString = String(query);
    }

    // console.log('GraphQL Request:', {
    //   url: this.apiUrl,
    //   query: queryString.substring(0, 100) + '...',
    //   variables: JSON.stringify(variables),
    // });

    return new Promise((resolve, reject) => {
      wx.request({
        url: this.apiUrl,
        method: 'POST',
        header: this.getHeaders(token),
        data: JSON.stringify({
          query: queryString,
          variables: variables || {},
        }),
        success: (res) => {
          // console.log('GraphQL Response Status:', res.statusCode);
          // console.log('GraphQL Response Headers:', res.header);
          // console.log('GraphQL Response Data:', res.data);
          
          const result = res.data;

          if (result && result.errors) {
            console.error('GraphQL errors:', result.errors);
            const errorMessages = result.errors.map(err => err.message).join('; ');
            reject(new Error(errorMessages));
          } else if (res.statusCode === 200) {
            if (result.data) {
              const vendureToken = res.header['vendure-auth-token'];
              if (vendureToken) {
                wx.setStorageSync('vendure-auth-token', vendureToken);
              }
            }
            resolve(result.data || {});
          } else {
            const errorMsg = result?.message || `HTTP error: ${res.statusCode}`;
            reject(new Error(errorMsg));
          }
        },
        fail: (error) => {
          console.error('GraphQL request failed:', error);
          reject(error);
        },
      });
    });
  }

  async query(query, variables = {}, token = '') {
    return this.request(query, variables, token);
  }

  async mutate(mutation, variables = {}, token = '') {
    return this.request(mutation, variables, token);
  }
}

const graphqlClient = new GraphQLClient();

module.exports = {
  graphqlClient,
  GraphQLClient,
};
