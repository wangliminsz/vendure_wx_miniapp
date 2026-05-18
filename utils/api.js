const config = require('../config.js');

class GraphQLClient {
  constructor() {
    this.apiUrl = config.development.API_URL;
    this.channelToken = config.CHANNEL_TOKEN;
    this.authToken = '';
  }

  getHeaders(token = '') {
    const headers = {
      'Content-Type': 'application/json',
    };

    const authToken = token || this.authToken || wx.getStorageSync('vendure_token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (this.channelToken) {
      headers['vendure-token'] = this.channelToken;
    }

    return headers;
  }

  async request(query, variables = {}, token = '') {
    let queryString = query;
    if (typeof query === 'object' && query.loc && query.loc.source && query.loc.source.body) {
      queryString = query.loc.source.body;
    } else if (typeof query !== 'string') {
      queryString = String(query);
    }

    console.log('GraphQL Request:', {
      url: this.apiUrl,
      query: queryString.substring(0, 100) + '...',
      variables: JSON.stringify(variables),
    });

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
          console.log('GraphQL Response Status:', res.statusCode);
          console.log('GraphQL Response Headers:', res.header);
          console.log('GraphQL Response Data:', res.data);
          if (res.statusCode === 200) {
            const result = res.data;

            if (result.errors) {
              console.error('GraphQL errors:', result.errors);
              reject(new Error(result.errors[0].message));
            } else {
              if (result.data) {
                const vendureToken = res.header['vendure-auth-token'];
                if (vendureToken) {
                  wx.setStorageSync('vendure_token', vendureToken);
                }
              }
              resolve(result.data || {});
            }
          } else {
            reject(new Error(`HTTP error: ${res.statusCode}`));
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
