// pages/account/account.js
const promisify = (api) => (options = {}) => 
  new Promise((resolve, reject) => {
    api({ ...options, success: resolve, fail: reject })
  })

const getStorage = promisify(wx.getStorage)
const showModal = promisify(wx.showModal)

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isLogin: false,
    status: -1,
    username: "",
    password: "",
    phoneNumber: "",
    userInfo: {},
    pendingCount: 0
  },

  onLoad(){
    this.tryLogin()
  },

  onShow() {
    if (this.data.isLogin) {
      this.updatePendings()
    }
  },

  onShareAppMessage() {
    return {
      title: 'xiaodi电竞 为您服务!',
      path: 'pages/account/account',
      imageUrl: '/images/logo.png'
    }
  },

  async tryLogin() {
    try {
      // 1. 读取本地存储
      const usernameRes = await getStorage({ key: 'username' }).catch(() => ({}))
      const phoneNumberRes = await getStorage({ key: 'phoneNumber' }).catch(() => ({}))
      const passwordRes = await getStorage({ key: 'password', encrypt: true }).catch(() => ({}))

      const username = usernameRes.data
      const phoneNumber = phoneNumberRes.data
      const password = passwordRes.data

      // 2. 没有保存的凭据，直接返回
      if (!phoneNumber || !password) return

      // 3. 弹窗确认
      const modalRes = await showModal({
        title: '自动登录',
        content: `已保存${username}的登录信息，可直接登录`
      })

      if (!modalRes.confirm) return

      // 4. 调云函数登录
      wx.showLoading({ title: '自动登录中' })

      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          phoneNumber: phoneNumber,
          password: password,
          status: 'user'
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        const app = getApp()
        app.appData.userInfo = res.result.userInfo

        this.setData({
          isLogin: true,
          username: username,
          userInfo: res.result.userInfo
        })
        this.updatePendings()

        wx.showToast({ title: '登录成功', icon: 'success' })
      } else {
        wx.showToast({ title: '自动登录失败', icon: 'none' })
      }

    } catch (err) {
      wx.hideLoading()
      console.error('自动登录异常:', err)
    }
  },

  onInputUser(e) {
    this.setData({ username: e.detail.value })
  },

  onInputPwd(e) {
    this.setData({ password: e.detail.value })
  },

  async onInputPhoneNumber(e) {
    if (e.detail.errMsg === 'getPhoneNumber:fail user deny') {
      wx.showToast({
        title: '请同意获取手机号',
        icon: 'none'
      })
      return;
    }

    wx.showLoading({
      title: '加载中'
    })
    const code = e.detail.code
    const res = await wx.cloud.callFunction({
      name: 'getPhoneNumber',
      data: {
        code: code
      }
    })

    this.setData({
      phoneNumber: res.result.phoneInfo.phoneNumber
    })
    wx.hideLoading()
  },

  openSwitch() {
    wx.showActionSheet({
      itemList: ['登录', '注册'],
      success: (res) => {
        this.setData({
          status: res.tapIndex
        })
        if (res.tapIndex === 1) {
          wx.showModal({
            title: '提示',
            content: '请保证电话畅通,必要时将通过此联系您!',
            showCancel: false
          })
        }
      }
    })
  },
  Register() {
    const { username, password, phoneNumber } = this.data

    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    if (!password || password.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }
    if (!username?.trim()) {
      wx.showToast({ title: '请输入用户名', icon: 'none' })
      return
    }
  
    // 显示加载中
    wx.showLoading({ title: '注册中...', mask: true })
  
    wx.cloud.callFunction({
      name: 'register',
      data: {
        username: username,
        password: password,
        phoneNumber: phoneNumber,
        status: 'user'
      },
      success: (res) => {
        wx.hideLoading()
        if (res.result.success) {
          /*const openid = res.result.openid
          if (openid) {
            wx.setStorageSync('openid', openid)
          }*/
          wx.showToast({
            title: '注册成功',
            icon: 'success',
            duration: 2000
          })
          setTimeout(() => {
            this.setData({ status: 0 })
          }, 2000)
        }
        else {
          wx.showToast({
            title: res.result.errMsg || '注册失败',
            icon: 'none',
            duration: 2000
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('注册调用失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },
  async Login() {
    const { phoneNumber, password } = this.data
  
    // 1. 参数校验
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    if (!password || password.length < 6) {
      wx.showToast({ title: '密码至少6位', icon: 'none' })
      return
    }
  
    wx.showLoading({ title: '登录中' })
  
    try {
      // 2. 调用云函数
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          phoneNumber: phoneNumber,
          password: password,
          status: 'user'
        }
      })
  
      const result = res.result
      wx.hideLoading()

      if (result.success) {
        // 3. 存到全局
        const app = getApp()
        app.appData.userInfo = result.userInfo
  
        // 4. 更新页面状态
        this.setData({
          isLogin: true,
          userInfo: result.userInfo
        })
  
        // 5. 存到本地存储
        wx.setStorage({
          key: 'username',
          data: result.userInfo.username
        })
        wx.setStorage({
          key: 'phoneNumber',
          data: phoneNumber
        })
        wx.setStorage({
          key: 'password',
          data: password,
          encrypt: true
        })
        this.updatePendings()

        wx.showToast({ title: result.message, icon: 'success', duration: 2000 })
      } else {
        wx.showToast({ title: result.message, icon: 'error', duration: 2000 })
      }
  
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '网络错误，请重试', icon: 'none' })
    }
  },

  Logout(){
    const app = getApp()
    app.appData.userInfo = {}

    this.setData({
      isLogin: false,
      userInfo: {},
      status: 0
    })
  },

  changeStatus(e){
    const status = e.currentTarget.dataset.status;
    this.setData({
      status: Number(status)
    })
  },

  // 管理员页面
  ToManage(){
    if(this.data.userInfo.isAdmin){
      wx.navigateTo({
        url: "/pages/manager/index"
      })
    }
  },

  // 订单页
  goToOrders(e) {
    const openType = e.currentTarget.dataset.type
    wx.navigateTo({
      url: `/pages/order/index?openType=${openType}`
    })
  },

  // 更新待确认订单数
  async updatePendings(){
    const res = await wx.cloud.database().collection('orders').where({
      isConfirm: false,
      _openid: this.data.userInfo.openid
    }).get()

    if(res.data){
      this.setData({
        pendingCount: res.data.length
      })
    }
  },
  ToPartnerPage() {
    wx.navigateTo({
      url: '/pages/partnerAccount/index'
    })
  }
})