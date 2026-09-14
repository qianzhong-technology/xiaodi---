// pages/manager/index.js
const db = wx.cloud.database()

Page({
  data: {
    activeTab: 0,

    goodsList: [],
    userList: [],
    adminName: "",

    // 发布商品
    p_goodName: '',
    p_goodPrice: 0,
    p_goodPlayTime: 0,
    p_goodDesc: '',
    p_faceImage: {},
    p_images: []
  },
  onLoad(){
    this.loadUsers();
    this.loadGoods();

    // 管理员名称
    wx.getStorage({
      key: 'username',
      success: (res) => {
        this.setData({
          adminName: res.data
        })
      }
    })
  },
  async loadUsers(filter = {}) {
    wx.showLoading({
      title: '加载用户列表'
    })
    try {
      const query = {}
      if (filter.phoneNumber) {
        query.phoneNumber = db.RegExp({
          regexp: filter.phoneNumber,
          options: 'i'
        })
      }
      if (filter.username) {
        query.username = db.RegExp({
          regexp: filter.username,
          options: 'i'
        })
      }

      const res = await db.collection('users').where(query).get()
      this.setData({
        userList: res.data
      })
    } catch (err) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },
  async loadGoods(goodName = ''){
    wx.showLoading({
      title: '加载商品列表'
    })
    try {
      const query = {}
      if(goodName != ''){
        query.name = db.RegExp({
          regexp: goodName
        })
      }

      const res = await db.collection('goods').where(query).get()
      if(res.data.length > 0){
        wx.cloud.callFunction({
          name: 'src_CloudToHttp',
          data: {
            goodDataOriginal: res.data,
            status: 'goods'
          },
          success: (res) => {
            this.setData({
              goodsList: res.result.goodData
            })
          }
        })
      }else{
        this.setData({
          goodsList: []
        })
      }
    } catch (err) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },
  async uploadImages() {
    // 轮播图片上传
    const swiperImages = []
    for (let i = 0; i < this.data.p_images.length; i++) {
      const filePath = this.data.p_images[i].tempFilePath
      const ext = filePath.split('.').pop() // png
      const cloudPath = `swiperImages/${Date.now()}-${Math.floor(Math.random() * 100000)}.${ext}`

      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      })
      swiperImages.push(uploadRes.fileID)
    }

    // 主图片上传
    const myext = this.data.p_faceImage.tempFilePath.split('.').pop() // png
    const mycloudPath = `goodImages/${Date.now()}-${Math.floor(Math.random() * 100000)}.${myext}`

    const myuploadRes = await wx.cloud.uploadFile({
      cloudPath: mycloudPath,
      filePath: this.data.p_faceImage.tempFilePath
    })
    const cloudFaceImage = myuploadRes.fileID

    return {
      swiperImages: swiperImages,
      faceImage: cloudFaceImage
    }
  },
  switchTab(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10)
    this.setData({
      activeTab: index
    })
  },
  Ban(e) {
    const index = e.currentTarget.dataset.index
    const key = `userList[${index}].isAvailable`
    const nowStatus = this.data.userList[index].isAvailable

    wx.showLoading({
      title: '加载中'
    })
    wx.cloud.callFunction({
      name: 'toggleBanUser',
      data: {
        userId: this.data.userList[index]._id,
        isAvailable: !nowStatus
      },
      success: (res) => {
        wx.hideLoading()
        if(res.result.success){
          wx.showToast({
            title: '操作成功',
            icon: 'none',
            duration: 2000
          })
          this.setData({
            [key]: !nowStatus
          })
        }else{
          wx.showToast({
            title: res.result.errMsg,
            icon: 'none',
            duration: 2000
          })
        }
      }
    })
  },
  searchUser(e) {
    const value = e.detail.value;
    const query = {};

    if(parseInt(value)){
      // 手机号
      query.phoneNumber = value;
    }else{
      // 用户名
      query.username = value;
    }

    this.loadUsers(query);
  },
  searchGood(e) {
    const goodName = e.detail.value;
    this.loadGoods(goodName);
  },

  onInputName(e) { this.setData({ p_goodName: e.detail.value }) },
  onInputPrice(e) { this.setData({ p_goodPrice: parseInt(e.detail.value) }) },
  onInputPlayTime(e) { this.setData({ p_goodPlayTime: parseInt(e.detail.value) }) },
  onInputDesc(e) { this.setData({ p_goodDesc: e.detail.value }) },

  addImage() {
    wx.chooseMedia({
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      count: 9,
      success: (res) => {
        const newImages = this.data.p_images;
        res.tempFiles.forEach(item => {
          newImages.push(item)
        })
        this.setData({
          p_images: newImages
        })
      }
    })
  },
  removeImage(e) {
    const _index = parseInt(e.currentTarget.dataset.index);
    const newImages = this.data.p_images.filter((_item, index) => index !== _index)
    this.setData({
      p_images: newImages
    })
  },
  addFaceImage() {
    wx.chooseMedia({
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      count: 1,
      success: (res) => {
        this.setData({
          p_faceImage: res.tempFiles[0]
        })
      }
    })
  },
  removeFaceImage() {
    this.setData({
      p_faceImage: {}
    })
  },
  async publishGood() {
    // 名称
    if (this.data.p_goodName.trim() === '') {
      wx.showToast({
        title: '请输入商品名称',
        icon: 'none',
        duration: 2000
      })
      return;
    }

    // 价格
    if (this.data.p_goodPrice <= 0) {
      wx.showToast({
        title: '请输入正确的价格',
        icon: 'none',
        duration: 2000
      })
      return;
    }

    // 时长
    if (this.data.p_goodPlayTime <= 0) {
      wx.showToast({
        title: '请输入游戏时长',
        icon: 'none',
        duration: 2000
      })
      return;
    }

    // 描述
    if (this.data.p_goodDesc.trim() === '') {
      wx.showToast({
        title: '请输入服务描述',
        icon: 'none',
        duration: 2000
      })
      return;
    }

    // 封面图
    if (Object.keys(this.data.p_faceImage).length === 0) {
      wx.showToast({
        title: '请上传封面图片',
        icon: 'none',
        duration: 2000
      })
      return;
    }

    // 轮播图
    if (this.data.p_images.length === 0) {
      wx.showToast({
        title: '请至少上传一张轮播图片',
        icon: 'none',
        duration: 2000
      })
      return;
    }

    wx.showLoading({
      title: '发布中'
    })
    
    const {swiperImages, faceImage} = await this.uploadImages()
    wx.cloud.callFunction({
      name: 'uploadGood',
      data: {
        name: this.data.p_goodName,
        price: this.data.p_goodPrice,
        playTime: this.data.p_goodPlayTime,
        desc: this.data.p_goodDesc,
        swiperImages: swiperImages,
        faceImage: faceImage,
        hot: 10
      },
      success(res){
        if(res.result.success){
          wx.hideLoading()
          wx.showToast({
            title: '发布成功',
            icon: 'success',
            duration: 2000
          })

          setTimeout(() => {
            wx.navigateBack()
          }, 2000)
        }
      }
    })
  },
  offShelf(e) {
    const index = e.currentTarget.dataset.index;
    const key = `goodsList[${index}].isAvailable`
    const nowStatus = this.data.goodsList[index].isAvailable

    wx.showLoading({
      title: '加载中'
    })
    wx.cloud.callFunction({
      name: 'toggleOffShelf',
      data: {
        goodId: this.data.goodsList[index]._id,
        isAvailable: !nowStatus
      },
      success: (res) => {
        wx.hideLoading()
        if(res.result.success){
          wx.showToast({
            title: '操作成功',
            icon: 'none',
            duration: 2000
          })
          this.setData({
            [key]: !nowStatus
          })
        }else{
          wx.showToast({
            title: res.result.errMsg,
            icon: 'none',
            duration: 2000
          })
        }
      }
    })
  },
  Edit() {
    wx.showToast({
      title: '小程序暂不支持',
      icon: 'error',
      duration: 2000
    })
  }
})