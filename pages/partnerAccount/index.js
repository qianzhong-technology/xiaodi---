// pages/partnerAccount/index.js
const db = wx.cloud.database()
const _ = db.command

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isLogin: false,
    partnerInfo: {},
    currentTab: 'login',
    agree: false,

    pendingOrders: [],
    goodsList: [],
    confirmedOrders: [],

    // 登录
    phone: '',
    password: '',

    // 注册
    regPhone: '',
    regPassword: '',
    avatarTempUrl: '',
    avatarCloudUrl: '',
    nickname: '',
    gender: '',
    bio: '',
    tagInput: '',
    tags: [],
    gameNameInput: '',
    gameLevelInput: '',
    games: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    wx.showModal({
      title: '提示',
      content: '此页面为陪玩登录通道,普通用户请返回',
      cancelText: '返回',
      confirmText: '我是陪玩',
      success(res) {
        if (res.cancel) {
          wx.navigateBack()
        }
      }
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  async onPullDownRefresh() {
    if (this.data.partnerInfo._id) {
      try {
        await Promise.all([
          this.loadGoods(),
          this.loadPendings(),
          this.loadConfirmedOrders()
        ])
      } catch (err) {
        wx.showToast({
          title: '刷新失败',
          icon: 'none'
        })
      }
    }
    wx.stopPullDownRefresh()
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '邀请您入驻 xiaodi电竞',
      path: '/pages/partnerAccount/index',
      imageUrl: '/images/logo.png'
    }
  },
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab

    switch (tab) {
      case 'orders':
        this.loadPendings()
        break;
      case 'confirmed':
        this.loadConfirmedOrders()
        break;
      case 'goods':
        this.loadGoods()
        break;
    }

    this.setData({
      currentTab: tab
    })
  },
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender
    this.setData({
      gender: gender
    })
  },
  onAgreeChange() {
    const currentAgree = this.data.agree
    this.setData({
      agree: !currentAgree
    })
  },
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    })
  },
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },
  onRegPhoneInput(e) {
    this.setData({
      regPhone: e.detail.value
    })
  },
  onRegPwdInput(e) {
    this.setData({
      regPassword: e.detail.value
    })
  },
  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    })
  },
  onBioInput(e) {
    this.setData({
      bio: e.detail.value
    })
  },

  async handleLogin() {
    const validRes = this.validateForm('login')
    if (!validRes.valid) {
      wx.showToast({
        title: validRes.msg,
        icon: 'none'
      })
      return;
    }

    const phone = this.data.phone
    const password = this.data.password

    wx.showLoading({
      title: '加载中'
    })

    const res = await wx.cloud.callFunction({
      name: 'login',
      data: {
        phone: phone,
        password: password,
        status: 'partner'
      }
    })
    if (res.result.success) {
      const Res = await wx.cloud.callFunction({
        name: 'src_CloudToHttp',
        data: {
          status: 'partners',
          partnersDataOriginal: [res.result.partnerInfo]
        }
      })
      if (Res.result.success) {
        wx.hideLoading()

        this.setData({
          isLogin: true,
          partnerInfo: Res.result.partnersData[0],
          currentTab: 'orders'
        })

        // 加载数据
        this.loadGoods()
        this.loadPendings()
        this.loadConfirmedOrders()
      }
    } else {
      wx.showToast({
        title: res.result.message,
        icon: 'error'
      })
    }
  },
  async handleRegister() {
    const data = this.data
    const validRes = this.validateForm('register')
    if (!validRes.valid) {
      wx.showToast({
        title: validRes.msg,
        icon: 'none'
      })
      return;
    }

    wx.showLoading({
      title: '加载中'
    })

    const res = await wx.cloud.callFunction({
      name: 'register',
      data: {
        status: 'partner',
        avatarUrl: data.avatarCloudUrl,
        phone: data.regPhone,
        password: data.regPassword,
        nickname: data.nickname,
        gender: data.gender,
        bio: data.bio,
        games: data.games,
        tags: data.tags
      }
    })

    wx.hideLoading()

    if (res.result.success) {
      wx.showToast({
        title: '注册成功',
        icon: 'success'
      })

      setTimeout(() => {
        this.setData({
          currentTab: 'login'
        })
      }, 2000)
    } else {
      wx.showToast({
        title: res.result.errMsg,
        icon: 'none'
      })
    }
  },
  validateForm(type) {
    // type: 'login' 或 'register'
    const data = this.data;

    if (type === 'login') {
      // 登录校验
      if (!data.phone || !/^1\d{10}$/.test(data.phone)) {
        return {
          valid: false,
          msg: '请输入正确的手机号'
        };
      }
      if (!data.password || data.password.length < 6) {
        return {
          valid: false,
          msg: '密码至少6位'
        };
      }
      if (!data.agree) {
        return {
          valid: false,
          msg: '请同意用户协议'
        };
      }
      return {
        valid: true,
        msg: ''
      };
    }

    if (type === 'register') {
      // 注册校验
      if (!data.regPhone || !/^1\d{10}$/.test(data.regPhone)) {
        return {
          valid: false,
          msg: '请输入正确的手机号'
        };
      }
      if (!data.regPassword || data.regPassword.length < 6) {
        return {
          valid: false,
          msg: '密码至少6位'
        };
      }
      if (!data.avatarCloudUrl || data.avatarCloudUrl < 1) {
        return {
          valid: false,
          msg: '请上传头像'
        }
      }
      if (!data.nickname || data.nickname.trim() === '') {
        return {
          valid: false,
          msg: '请输入昵称'
        };
      }
      if (!data.gender) {
        return {
          valid: false,
          msg: '请选择性别'
        };
      }
      if (!data.agree) {
        return {
          valid: false,
          msg: '请同意陪玩入驻协议'
        };
      }
      // bio 可选，不做强制校验
      return {
        valid: true,
        msg: ''
      };
    }

    return {
      valid: false,
      msg: '未知类型'
    };
  },
  async loadGoods(goodName = '') {
    wx.showLoading({
      title: '加载商品列表'
    })
    try {
      const query = {
        isAvailable: true
      }
      if (goodName !== '') {
        const escaped = goodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        query.name = db.RegExp({
          regexp: '^' + escaped
        })
      }

      const res = await db.collection('goods').where(query).get()
      if (res.data.length > 0) {
        wx.cloud.callFunction({
          name: 'src_CloudToHttp',
          data: {
            goodDataOriginal: res.data,
            status: 'goods'
          },
          success: (res) => {
            const goodData = res.result.goodData.map(item => {
              return {
                ...item,
                isChosen: item.availablePartners.includes(this.data.partnerInfo._id)
              }
            })
            this.setData({
              goodsList: goodData
            })
          }
        })
      } else {
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
  searchGood(e) {
    const goodName = e.detail.value;
    this.loadGoods(goodName);
  },
  async toggleChooseGoods(e) {
    const id = e.currentTarget.dataset.id
    const index = this.data.goodsList.findIndex(item => item._id === id)

    if (index === -1) {
      wx.showToast({
        title: '商品不存在',
        icon: 'none'
      })
      return
    }

    const good = this.data.goodsList[index]

    wx.showLoading({
      title: '加载中'
    })

    const res = await wx.cloud.callFunction({
      name: 'modifyAvailablePartners',
      data: {
        status: good.isChosen ? 'delete' : 'add',
        goodID: id,
        partnerID: this.data.partnerInfo._id
      }
    })

    wx.hideLoading()

    if (res.result.success) {
      const key = `goodsList[${index}].isChosen`
      this.setData({
        [key]: !good.isChosen
      })

      wx.showToast({
        title: '操作成功',
        icon: 'success'
      })
    } else {
      wx.showToast({
        title: res.result.errMsg,
        icon: 'none'
      })
    }
  },
  async onOnlineSwitch() {
    const partnerInfo = this.data.partnerInfo
    const nowStatus = partnerInfo.isOnline
    const key = 'partnerInfo.isOnline'

    wx.showLoading({
      title: '加载中'
    })

    await wx.cloud.callFunction({
      name: 'toggleChangeOnline',
      data: {
        partnerID: partnerInfo._id,
        status: !nowStatus
      }
    })

    this.setData({
      [key]: !nowStatus
    })

    wx.hideLoading()
  },
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFile = res.tempFiles[0]
        this.setData({
          avatarTempUrl: tempFile.tempFilePath
        })
        this.uploadAvatar()
      }
    })
  },
  async uploadAvatar() {
    // 图片上传
    wx.showLoading({
      title: '上传中'
    })
    const myext = this.data.avatarTempUrl.split('.').pop() // png
    const mycloudPath = `partnerAvatars/${Date.now()}-${Math.floor(Math.random() * 100000)}.${myext}`

    const myuploadRes = await wx.cloud.uploadFile({
      cloudPath: mycloudPath,
      filePath: this.data.avatarTempUrl
    })
    const cloudImage = myuploadRes.fileID
    this.setData({
      avatarCloudUrl: cloudImage
    })
    wx.hideLoading()
  },
  async loadPendings() {
    wx.showLoading({
      title: '加载中'
    })

    const res = await db.collection('orders').where({
      isConfirm: false,
      isPay: true,
      status: 'pending'
    }).get()

    if (res.data.length === 0) {
      this.setData({
        pendingOrders: []
      })
      wx.hideLoading()
      return;
    }

    const orders = res.data.filter(item => item.partner._id === this.data.partnerInfo._id)
    const goodIDs = [...new Set(orders.map(o => o.goodID))]
    const goodsRes = await db.collection('goods').where({
      _id: _.in(goodIDs)
    }).get()

    // 获取 https链接
    const Res = await wx.cloud.callFunction({
      name: 'src_CloudToHttp',
      data: {
        goodDataOriginal: goodsRes.data,
        status: 'goods'
      }
    })
    const goodsOriginal = Res.result.goodData

    // 建立 id -> data 的映射
    const goodsMap = {}
    goodsOriginal.forEach(g => {
      goodsMap[g._id] = g
    })

    const enrichedOrders = orders.map(order => ({
      ...order,
      goodData: goodsMap[order.goodID],
      createTime: formatDate(order.createTime)
    }))

    this.setData({
      pendingOrders: enrichedOrders
    })

    wx.hideLoading()
  },
  async confirmOrder(e) {
    const id = e.currentTarget.dataset.id
    const order = this.data.pendingOrders.find(item => item._id === id)

    const res = await wx.showModal({
      title: '提示',
      content: '此操作将通知用户且不可逆,是否继续?'
    })
    if (res.confirm) {
      wx.showLoading({
        title: '加载中'
      })
      await wx.cloud.callFunction({
        name: 'changeOrderState',
        data: {
          orderID: id,
          status: 'confirmed'
        }
      })
      await wx.cloud.callFunction({
        name: 'sendOrderState',
        data: {
          touser: order._openid,
          orderID: id,
          orderContent: order.goodData.name,
          orderState: '已确认',
          partners: this.data.partnerInfo.nickname,
          startTime: formatDate(new Date())
        }
      })
      await wx.cloud.callFunction({
        name: 'addUserConsumption',
        data: {
          openid: order._openid,
          goodID: order.goodID,
          totalAmount: order.amount * order.goodData.price
        }
      })
      wx.hideLoading()
      this.loadPendings()
    }
  },
  // 标签输入
  onTagInput(e) {
    this.setData({
      tagInput: e.detail.value
    })
  },

  // 添加标签
  addTag() {
    const tag = this.data.tagInput.trim()
    if (!tag) {
      wx.showToast({
        title: '请输入标签',
        icon: 'none'
      })
      return
    }
    if (this.data.tags.includes(tag)) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none'
      })
      return
    }
    this.setData({
      tags: [...this.data.tags, tag],
      tagInput: ''
    })
  },

  // 删除标签
  removeTag(e) {
    const index = e.currentTarget.dataset.index
    const tags = this.data.tags.filter((_, i) => i !== index)
    this.setData({
      tags: tags
    })
  },

  // 游戏名称输入
  onGameNameInput(e) {
    this.setData({
      gameNameInput: e.detail.value
    })
  },

  // 游戏等级输入
  onGameLevelInput(e) {
    this.setData({
      gameLevelInput: e.detail.value
    })
  },

  // 添加游戏
  addGame() {
    const name = this.data.gameNameInput.trim()
    const level = this.data.gameLevelInput.trim()
    if (!name || !level) {
      wx.showToast({
        title: '请填写游戏名称和段位',
        icon: 'none'
      })
      return
    }
    this.setData({
      games: [...this.data.games, {
        name,
        level
      }],
      gameNameInput: '',
      gameLevelInput: ''
    })
  },

  // 删除游戏
  removeGame(e) {
    const index = e.currentTarget.dataset.index
    const games = this.data.games.filter((_, i) => i !== index)
    this.setData({
      games
    })
  },
  async loadConfirmedOrders() {
    wx.showLoading({ title: '加载中' })
    try {
      const db = wx.cloud.database()
      const res = await db.collection('orders').where({
        isConfirm: true,
        status: 'confirmed'   // 已确认但未完成
      }).get()
  
      if (res.data.length === 0) {
        this.setData({ confirmedOrders: [] })
        wx.hideLoading()
        return
      }
  
      // 过滤属于当前陪玩的订单
      const orders = res.data.filter(item => item.partner._id === this.data.partnerInfo._id)
  
      // 并发查询商品信息（同 loadPendings）
      const goodsPromises = orders.map(order =>
        db.collection('goods').doc(order.goodID).get()
      )
      const goodsResults = await Promise.all(goodsPromises)
      const enrichedOrders = orders.map((order, index) => ({
        ...order,
        goodData: goodsResults[index].data,
        createTime: formatDate(order.createTime)
      }))
  
      this.setData({ confirmedOrders: enrichedOrders })
    } catch (err) {
      wx.showToast({
        title: err,
        icon: 'none'
      })
    }
    wx.hideLoading()
  },
  async completeOrder(e) {
    const id = e.currentTarget.dataset.id
    const res = await wx.showModal({
      title: '提示',
      content: '确认完成此订单？'
    })
    if (res.confirm) {
      wx.showLoading({
        title: '加载中'
      })

      await wx.cloud.callFunction({
        name: 'changeOrderState',
        data: {
          orderID: id,
          status: 'completed'
        }
      })

      wx.hideLoading()
      
      // 重新加载待完成列表
      this.loadConfirmedOrders()
    }
  }
})

function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  const Y = d.getFullYear()
  const M = String(d.getMonth() + 1).padStart(2, '0')
  const D = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${Y}-${M}-${D} ${h}:${m}`
}