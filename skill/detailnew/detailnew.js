const config = require('../../config.js');

Page({
  data: {

    isLoading: true,

    playButtonTop: 0,
    playButtonLeft: 0,

    myAmenityPath: `${config.amenityPath}`,

    showBackToTop: false,

    property: {},
    w_docs_icon: [],

    pictures: [],
    facilities: [],
    surroundings: [],
    facilityToSvgMap: {
      '游泳池': 'swimming_pool.svg',
      '健身房': 'gym.svg',
      '24小时监控': 'cctv.svg',
      '警卫': 'security_guard.svg',
      '桑拿房': 'sauna.svg',
      '花园': 'garden.svg',
      '大堂': 'lobby.svg',
      '娱乐设施': 'amusement_park.svg',
      '游乐场': 'amusement_park.svg',
      '阳台': 'balcony.svg',
      '酒吧': 'bar.svg',
      '共享办公': 'coworking_place.svg',
      '会议室': 'meeting_room.svg'
    },

    showWebView: false

  },

    // 预览主图
    previewMainImage: function () {
      const imageUrl = this.data.property.w_thumbnail;
  
      if (imageUrl) {
        wx.previewImage({
          current: imageUrl, // 当前显示图片的链接
          urls: [imageUrl] // 需要预览的图片链接列表
        })
      } else {
        wx.showToast({
          title: '没有可预览的图片',
          icon: 'none'
        });
      }
    },
  
    // 预览大图
    previewImage: function (e) {
      const index = e.currentTarget.dataset.index;
      const images = this.data.property.w_pics;

      console.log('2025-4-11-------> Image Index', index)
  
      wx.previewImage({
        current: images[index], // 当前显示图片的链接
        urls: images // 需要预览的图片链接列表
      })
    },
  

  async onLoad(options) {
    console.log('2025 Detail id-->>>>', options, options.id)

    let gRecords_data
    let gRecords

    try {
      gRecords_data = await this.fetchData(options.id)
      gRecords = gRecords_data.records
    } catch (error) {
      console.log('get Odoo Detail Page err --->>>', error);
    }

    // // ~~~~~~~~~~~~~~~~~~~~~~~

    if (gRecords) {
      const updatedRecords = gRecords.map(record => {

        return {
          ...record,
        };
      });

      this.setData({
        property: updatedRecords[0],
        isLoading: false
      }, () => {
        console.log("2025 2025 2025 New onLoad Detail -> propertyRecords--->", this.data.property);

        // ~~~~~~~~
        // console.log('w_docs_icon --->>>', this.data.w_docs_icon)
        // console.log('property {} --->>>', this.data.property)
        const docsWithIcons = this.data.property.w_docs.map(url => ({
          url: url,
          icon: this.getIcon(url)
        }));
        this.setData({
          w_docs_icon: docsWithIcons
        }, () => {
          console.log('w_docs_icon --->>>', this.data.w_docs_icon)
        });
        // ~~~~~~~~

      });
    }

  },

  // ~~~~~~~~~~~~~~~~~~~~~~~

  async fetchData(itemId) {

    const theOdooToken = wx.getStorageSync('odootoken')
    let oToken
    let odoo_token

    if (theOdooToken) {
      odoo_token = theOdooToken
    } else {
      try {
        oToken = await this.getOdooToken()
        if (oToken) {
          odoo_token = oToken.access_token
          wx.setStorageSync('odootoken', oToken.access_token)
        } else {}
      } catch (error) {
        console.log('get Token err --->>>', error);
        this.errorMessage = error.errMsg;
      }
    }


    try {
      let dataURL
      dataURL = `${config.fastapiUrl}/th_ant_new?dbid=${itemId}`
      // ~~~~~~~
      let headers = {
        'Content-Type': 'application/json', // Example header
        'Authorization': `Bearer ${odoo_token}`
      };
      // ~~~~~~~~~~~~~~~~~~~~~~~
      return new Promise((resolve, reject) => {

        wx.request({
          url: dataURL,
          method: 'GET',
          header: headers,
          success: res => {
            resolve(res.data);
          },
          fail: err => {
            if (err.statusCode === 401 && err.data && err.data.detail && err.data.detail.includes("Token has expired")) {
              console.log("my Msg-->>Token has expired, refresh it.");
            } else {
              console.error('Error loading records:', err);
            }
            reject(err);
          }
        });

      });

    } catch (error) {
      console.error('Error loading records:', error);
    }

  },

  // ~~~~~~~~~~~~~~~~~~~~~~~ //回到顶部

  onPageScroll: function (e) {
    // 使用 wx.getWindowInfo() 获取窗口高度
    const windowInfo = wx.getWindowInfo();

    // e.scrollTop contains the current scroll position
    if (e.scrollTop > windowInfo.windowHeight) {
      this.setData({
        showBackToTop: true
      });
    } else {
      this.setData({
        showBackToTop: false
      });
    }
  },

  scrollToTop: function () {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    });
  },

  downloadFile: function (e) {
    const url = e.currentTarget.dataset.url;
    wx.downloadFile({
      url: url,
      success: function (res) {
        const filePath = res.tempFilePath;
        const fs = wx.getFileSystemManager();
        fs.saveFile({
          tempFilePath: filePath,
          success: function (result) {
            wx.showToast({
              title: 'Download successful!',
              icon: 'success'
            });

            // Open the document if it's a supported type
            wx.openDocument({
              filePath: result.savedFilePath,
              showMenu: true,
              success: function () {
                console.log('Document opened successfully');
              },
              fail: function () {
                wx.showToast({
                  title: 'Failed to open document!',
                  icon: 'none'
                });
              }
            });

            // Call getSavedFileList to update the list of saved files
            wx.getFileSystemManager().getSavedFileList({
              success: function (res) {
                console.log('Saved files:', res.fileList);
              }
            });


          },
          fail: function () {
            wx.showToast({
              title: 'Download failed!',
              icon: 'none'
            });
          }
        });
      },
      fail: function () {
        wx.showToast({
          title: 'Download failed!',
          icon: 'none'
        });
      }
    });
  },

  
  
  getIcon: function (url) {
    const extension = url.split('.').pop().toLowerCase();
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return '/static/images/file_icons/EXCEL.svg';
      case 'pdf':
        return '/static/images/file_icons/PDF.svg';
      case 'jpg':
      case 'jpeg':
        return '/static/images/file_icons/JPEG.svg';
      case 'png':
        return '/static/images/file_icons/PNG.svg';
      case 'mp4':
        return '/static/images/file_icons/MP4.svg';
      case 'pptx':
      case 'ppt':
        return '/static/images/file_icons/PPTX.svg';
      case 'txt':
        return '/static/images/file_icons/TXT.svg';
      case 'docx':
      case 'doc':
        return '/static/images/file_icons/WORD.svg';
      case 'zip':
        return '/static/images/file_icons/ZIP.svg';
      default:
        return '/static/images/file_icons/HTML.svg';
    }
  },

  // ~~~~~~~~~~~~~~~~~~~~~~~
  // 分享给朋友，分享到朋友圈

  onShareAppMessage: function () {
    const {
      property
    } = this.data;
    console.log('from Share Msg Action--->', property)
    return {
      title: 'Ant Global',
      path: `/pages/detailnew/detailnew?id=${property ? property.id : ''}`,
    };
  },

  // onShareTimeline

  onShareTimeline: function () {
    const {
      property
    } = this.data;
    // encodeURIComponent() //`${thisImage}`
    const thisImage = this.data.property.b_thumbnail;
    // console.log('from Share Timeline Action--->', property)
    console.log('from Share Timeline Image--->', thisImage)

    return {
      title: 'Ant Global',
      path: `/pages/detailnew/detailnew?id=${property ? property.id : ''}`,
      imageUrl: thisImage
    };
  },

  //  ~~~~~~~~~~~~~~~~~~~~~~

  async getOdooToken() {
    try {
      let tokenURL = `${config.development.ODOO_Token_URL}`;
      return new Promise((resolve, reject) => {
        wx.request({
          url: tokenURL,
          method: 'GET',
          // header: headers,
          success: res => {
            resolve(res.data);
            // console.log('APP inside WX request Token 2024-->>>', res.data)
          },
          fail: err => {
            reject(err);
          }
        });
      });

    } catch (error) {
      console.error('Error loading token:', error);
    }
  },

  // ~~~~~~~~~~~~~~~~~~~~~~~

  onWxTextTap: function (event) {
    const wxUserId = event.currentTarget.dataset.wxuserid;
    const wxFeedId = event.currentTarget.dataset.wxfeedid;

    // Now you can use wxUserId and wxFeedId as needed
    wx.openChannelsActivity({
      finderUserName: wxUserId,
      feedId: wxFeedId,
      success(res) {
        console.log('拉起视频号成功', res);
      },
      fail(res) {
        console.log('拉起视频号失败', res);
      }
    });
  },

  // ~~~~~~~~~~~~~~~~~~~~~~~

  onImageLoad: function (event) {
    const {
      width,
      height
    } = event.detail;

    // Calculate the center position for the play button
    const playButtonTop = height / 2;
    const playButtonLeft = width / 2;

    // Update the data to position the play button
    this.setData({
      playButtonTop,
      playButtonLeft
    });
  },

  // ~~~~~~~~~~~~~~~~~~~~~~~
  // 微信公众号 文章介绍

  showArticle: function (event) {
    const url = event.currentTarget.dataset.url;
    wx.navigateTo({
      url: '/pages/listnew/listnew_article?articleUrl=' + encodeURIComponent(url)
    });
  },


});

