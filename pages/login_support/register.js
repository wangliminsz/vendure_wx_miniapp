// index.js
// const defaultAvatarUrl = '`${config.avatarImg}`'

const config = require('../../config.js');

Page({
  data: {
    isAgreed: false, //微信审核要求

    baseUrl: config.fastapiUrl,

    userOpenId: '',
    userAvatarUrl: config.avatarImg,
    userNickName: '',
    userMobile: '',
    userMobileColor: '#707070', // 初始文本颜色

    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
  },

  checkboxChange(e) {
    this.setData({
      isAgreed: e.detail.value.length > 0
    });
  },

  async onLoad() {

    console.log("config.fastapiUrl--->", `${config.fastapiUrl}`)
    console.log("config.fastapiUrl--->", this.data.baseUrl)

    const openid = wx.getStorageSync('openid');
    const avatarurl = wx.getStorageSync('avatarurl');
    const nickname = wx.getStorageSync('nickname');
    const mobile = wx.getStorageSync('mobile');

    //local Storage
    try {
      if (openid) {
        this.setData({
          userOpenId: openid,
        }, () => {
          console.log("register onload get openid--->", this.data.userOpenId);
        });
      }

      if (!avatarurl || avatarurl === `${config.avatarImg}`) {} else {
        this.setData({
          userAvatarUrl: avatarurl
        }, () => {
          console.log("localStorage Read avatar nickname--->", this.data.userAvatarUrl,
            this.data.userNickName);
        });
      }

      if (!nickname) {} else {
        this.setData({
          userNickName: nickname
        }, () => {
          console.log("localStorage Read avatar nickname--->", this.data.userAvatarUrl,
            this.data.userNickName);
        });
      }

      if (!mobile) {} else {
        this.setData({
          userMobile: mobile,
        }, () => {
          console.log("localStorage Read mobile --->", this.data.userMobile);
        });
      }
    } catch (e) {
      console.error('Error onLoad:', e);
    };
  },

  bindSubmit() {
    const openid = this.data.userOpenid;
    const avatarurl = this.data.userAvatarUrl;
    const nickname = this.data.userNickName;
    const mobile = this.data.userMobile;

    if (this.data.isAgreed) {
      // Proceed with submission
      console.log('Submitting information...');

      // 2024-11-29 Add your submission logic here


      // || !mobile
      if (avatarurl === `${config.avatarImg}` || !nickname) {
        wx.showToast({
          title: '请授权微信头像及昵称',
          icon: 'none',
          duration: 2500
        });
        // return;
      } else {
        // console.log('this.userOpenId--->', this.data.userOpenId)
        // console.log('this.userAvatarUrl--->', this.data.userAvatarUrl)
        // console.log('this.userNickName--->', this.data.userNickName)
        // console.log('this.userMobile--->', this.data.userMobile)

        // wx.setStorageSync('avatarurl', this.data.userAvatarUrl)
        // wx.setStorageSync('nickname', this.data.userNickName)
        // wx.setStorageSync('mobile', this.data.userMobile)

        this.cloudDbWrite(this.data.userOpenId, this.data.userAvatarUrl, this.data.userNickName, this.data.userMobile).then(() => {
            wx.showToast({
              title: '提交成功',
              icon: 'success',
              duration: 2000,
              complete: () => {
                setTimeout(() => {
                  // wx.navigateBack();
                  wx.switchTab({
                    url: '/pages/login/login',
                    success: () => {
                      console.log('User info updated and switched to TabBar page');
                    }
                  });
                }, 2000); // Navigate back after 2 seconds
              }
            });

            wx.setStorageSync('avatarurl', this.data.userAvatarUrl)
            wx.setStorageSync('nickname', this.data.userNickName)
            wx.setStorageSync('mobile', this.data.userMobile)

          })
          .catch(err => {
            console.error('Failed to submit user info:', err);
            wx.showToast({
              title: '提交失败，请重试',
              icon: 'none',
              duration: 2500
            });
          });

      }


      // 2024-11-29 Add your submission logic here


    } else {
      wx.showToast({
        title: '请先同意用户协议和隐私政策',
        icon: 'none'
      });
    }


  },























  // Function to write to the cloud database
  cloudDbWrite(userOpenId, userAvatarUrl, userNickName, userMobile) {

    const app = getApp();
    if (!app.cloud) {
      console.error('Cloud is not initialized');
      return null;
    }


    const db = app.cloud.database();
    const userCollection = db.collection('user');
    // Check if the openid already exists
    return userCollection.where({
      openid: userOpenId
    }).get().then(res => {
      if (res.data.length > 0) {
        // If openid exists, update the record
        const docId = res.data[0]._id;
        return userCollection.doc(docId).update({
          data: {
            avatarurl: userAvatarUrl,
            nickname: userNickName,
            mobile: userMobile
          }
        }).then(() => {
          console.log('User info updated successfully');
        }).catch(err => {
          console.error('Failed to update user info:', err);
        });
      } else {
        // If openid does not exist, add a new record
        return userCollection.add({
          data: {
            openid: userOpenId,
            avatarurl: userAvatarUrl,
            nickname: userNickName,
            mobile: userMobile
          }
        }).then(() => {
          console.log('User info added successfully');
        }).catch(err => {
          console.error('Failed to add user info:', err);
        });
      }
    }).catch(err => {
      console.error('Failed to query user info:', err);
    });
  },









  onChooseAvatar(e) {

    const app = getApp();
    if (!app.cloud) {
      console.error('Cloud is not initialized');
      return null;
    }

    const avatarurl = e.detail.avatarUrl;
    const nickname = this.data.userNickName;
    const mobile = this.data.userMobile;
    // 调用上传函数
    this.uploadAvatarToCloud(avatarurl)
  },

  uploadAvatarToCloud(avatarUrl) {

    const app = getApp();
    if (!app.cloud) {
      console.error('Cloud is not initialized');
      return null;
    }

    console.log("my filePath--->", avatarUrl)

    app.cloud.uploadFile({
      cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`, // 生成唯一的文件名
      filePath: avatarUrl,
      success: res => {
        // console.log('Upload success:', res)
        // const fileUrl = res.fileID // 获取文件ID
        // console.log('File URL:', fileUrl)

        // this.setData({
        //   "userAvatarUrl": fileUrl,
        // });

        console.log('Upload success:', res)
        const fileID = res.fileID

        // Get a temporary HTTP URL
        app.cloud.getTempFileURL({
          fileList: [fileID],
          success: res => {
            const tempFileURL = res.fileList[0].tempFileURL
            console.log('Temp File URL:', tempFileURL)

            // Update the userAvatarUrl with the HTTP URL
            this.setData({
              userAvatarUrl: tempFileURL,
            }, ()=>{
              console.log('the userAvatarUrl---->>>> 2025-08-24--->', this.data.userAvatarUrl)
            })
          },
          fail: err => {
            console.error('Failed to get temp URL:', err)
          }
        })





      },

      fail: err => {
        console.error('Upload failed:', err)
      },
    })



  },

  onInputChange(e) {
    const nickname = e.detail.value
    const avatarurl = this.data.userAvatarUrl;
    const mobile = this.data.userMobile;

    this.setData({
      "userNickName": nickname,
    })
  },

  // Handle phone number authorization
  getPhoneNumber: function (e) {
    if (e.detail.errMsg === "getPhoneNumber:ok") {
      wx.login({
        success: res => {
          if (res.code) {
            // Send the encrypted data and code to your backend
            wx.request({
              url: `${config.fastapiUrl}/get_ark_phone_number`,
              method: 'POST',
              data: {
                code: res.code,
                encryptedData: e.detail.encryptedData,
                iv: e.detail.iv
              },
              success: response => {
                if (response.statusCode === 200) {
                  wx.showToast({
                    title: '手机号获取成功',
                    icon: 'success',
                    duration: 2000
                  });
                  this.setData({
                    "userMobile": response.data.phone_number,
                    "userMobileColor": '#333',
                  });
                  console.log('my MobileColor 2--->>', this.data.userMobileColor)

                } else {
                  wx.showToast({
                    title: '手机号获取失败',
                    icon: 'none',
                    duration: 2000
                  });
                }
              },
              fail: err => {
                wx.showToast({
                  title: '请求失败',
                  icon: 'none',
                  duration: 2000
                });
              }
            });
          } else {
            wx.showToast({
              title: '登录失败',
              icon: 'none',
              duration: 2000
            });
          }
        }
      });
    } else {
      wx.showToast({
        title: '用户拒绝授权',
        icon: 'none',
        duration: 2000
      });
    }
  }

})