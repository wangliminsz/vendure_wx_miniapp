const app = getApp();
const config = require('../../config.js');
const utils = require('../../utils/util.js');

Page({
  data: {
    high_price: '',
    low_price: '',
    activeAlerts: []
  },

  onLoad: function () {
    this.fetchAlerts();
  },

  deleteAlert: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: 'Confirm Deletion',
      content: 'Are you sure you want to delete this alert?',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            // url: `https://linefs.favor100.site/remove/?id=${id}`,
            url: `${config.asterUrl}/remove/?id=${id}`,
            method: 'DELETE',
            success: (res) => {
              console.log('Alert deleted successfully');
              this.fetchAlerts(); // Refresh the alerts list
            },
            fail: (err) => {
              console.error('Failed to delete alert:', err);
              wx.showToast({
                title: 'Failed to delete alert',
                icon: 'none',
                duration: 2000
              });
            }
          });
        }
      }
    });
  },

  formatNumber: function (number) {
    return number.toFixed(2);
  },

  fetchAlerts: function () {
    wx.request({
      url: `${config.asterUrl}/alerts`,
      method: 'GET',
      header: {
        'Accept': 'application/json'
      },
      // success: (res) => {
      //   const activeAlerts = res.data.alerts.filter(alert => alert.if_alerted === "no");
      //   this.setData({
      //     activeAlerts
      //   });
      // },
      // fail: (err) => {
      //   console.error('Failed to fetch alerts:', err);
      // }

      success: (res) => {
        const activeAlerts = res.data.alerts
          .filter(alert => alert.if_alerted === "no")
          .map(alert => ({
            ...alert,
            target_price_high: alert.target_price_high ? alert.target_price_high.toFixed(2) : '--',
            target_price_low: alert.target_price_low ? alert.target_price_low.toFixed(2) : '--'
          }));
        this.setData({
          activeAlerts
        });
      },
      fail: (err) => {
        console.error('Failed to fetch alerts:', err);
      }

    });
  },


  onHighPriceInput: function (e) {
    this.setData({
      high_price: e.detail.value
    });
  },

  onLowPriceInput: function (e) {
    this.setData({
      low_price: e.detail.value
    });
  },

  handleSubmission() {
    const highPrice = parseFloat(this.data.high_price);
    const lowPrice = parseFloat(this.data.low_price);

    if (isNaN(highPrice) && isNaN(lowPrice)) {
      wx.showToast({
        title: 'Please enter a valid number',
        icon: 'none',
        duration: 2000
      });
      return Promise.reject('Invalid input');
    }

    try {
      let dataURL = `${config.asterUrl}/add_alert`;
      let headers = {
        'Content-Type': 'application/json',
      };

      const requestBody = {};
      if (!isNaN(highPrice)) requestBody.target_price_high = highPrice;
      if (!isNaN(lowPrice)) requestBody.target_price_low = lowPrice;

      return new Promise((resolve, reject) => {
        wx.request({
          url: dataURL,
          method: 'POST',
          header: headers,
          data: requestBody,
          success: res => {
            console.log('Url submit success:', res.data);
            resolve(res.data);
            wx.showToast({
              title: '上传成功!',
              icon: 'success',
              duration: 2000
            });
          },
          fail: err => {
            console.error('Error submitting alert:', err);
            wx.showToast({
              title: 'Failed to submit alert',
              icon: 'none',
              duration: 2000
            });
            reject(err);
          }
        });
      });

    } catch (error) {
      console.error('2025-09-25---> Error in Aster_Submit Btn:', error);
      wx.showToast({
        title: 'An error occurred',
        icon: 'none',
        duration: 2000
      });
      return Promise.reject(error);
    }
  },

  onSubmit(event) {
    this.handleSubmission()
      .then(() => {
        console.log('Submission completed successfully');
        this.fetchAlerts(); // Refresh alerts after submission
      })
      .catch((error) => {
        console.error('Submission failed:', error);
      });
  },

  onClear: function () {
    this.setData({
      high_price: '',
      low_price: ''
    }, () => {
      console.log('Cleared inputs:', this.data.high_price, this.data.low_price);
      wx.showToast({
        title: 'Inputs cleared',
        icon: 'success',
        duration: 2000
      });
    });
  }
});































// Page({
//   data: {
//     high_price: '',
//     low_price: '',
//   },

//   onHighPriceInput: function (e) {
//     this.setData({
//       high_price: e.detail.value
//     });
//   },

//   onLowPriceInput: function (e) {
//     this.setData({
//       low_price: e.detail.value
//     });
//   },

//   // ant 提交 ~~~~~~~~~~~~~~~~~~~~~~

//   handleSubmission() {
//     const highPrice = parseFloat(this.data.high_price);
//     const lowPrice = parseFloat(this.data.low_price);

//     if (isNaN(highPrice) && isNaN(lowPrice)) {
//       wx.showToast({
//         title: 'Please enter a valid number',
//         icon: 'none',
//         duration: 2000
//       });
//       return;
//     }

//     try {
//       let dataURL = `${config.asterUrl}/add_alert`;
//       let headers = {
//         'Content-Type': 'application/json',
//       };

//       const requestBody = {};
//       if (!isNaN(highPrice)) requestBody.target_price_high = highPrice;
//       if (!isNaN(lowPrice)) requestBody.target_price_low = lowPrice;

//       return new Promise((resolve, reject) => {
//         wx.request({
//           url: dataURL,
//           method: 'POST',
//           header: headers,
//           data: requestBody, // Add the request body here
//           success: res => {
//             console.log('Url submit success:', res.data);
//             resolve(res.data);
//             wx.showToast({
//               title: '上传成功!',
//               icon: 'none',
//               duration: 2000
//             });
//           },
//           fail: err => {
//             console.error('Error submitting alert:', err);
//             wx.showToast({
//               title: 'Failed to submit alert',
//               icon: 'none',
//               duration: 2000
//             });
//             reject(err);
//           }
//         });
//       });

//     } catch (error) {
//       console.error('2025-09-25---> Error in Aster_Submit Btn:', error);
//       wx.showToast({
//         title: 'An error occurred',
//         icon: 'none',
//         duration: 2000
//       });
//     }

//   },

//   onSubmit(event) {
//     this.handleSubmission()
//       .then(() => {
//         console.log('Submission completed successfully');
//       })
//       .catch((error) => {
//         console.error('Submission failed:', error);
//       });
//   },

//   onClear: function () {
//     this.setData({
//       high_price: '',
//       low_price: ''
//     }, () => {
//       console.log('Cleared inputs:', this.data.high_price, this.data.low_price);
//       wx.showToast({
//         title: 'Inputs cleared',
//         icon: 'success',
//         duration: 2000
//       });
//     });
//   }
// });




// const type = event.currentTarget.dataset.type;
// if (type === 'ant') {
//   this.handleSubmission('ant');
// } else if (type === 'doc') {
//   this.handleSubmission('doc');
// }