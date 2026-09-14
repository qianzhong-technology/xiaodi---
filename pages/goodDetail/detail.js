// pages/goodDetail/detail.js
const db = wx.cloud.database()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    goodData: {},
    swiperImgs: [],
    isShowSwiperImgs: false,
    availablePartners: [],
    commentList: [],
    dataSource: -1,
    inCartAmount: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const sharedGoodID = options.id;
    const app = getApp()
    const userInfo = app.appData.userInfo

    const processGoodData = async (goodData) => {
      const data = Array.isArray(goodData) ? goodData[0] : goodData
      if (!data) return

      // 加载轮播图
      const swiperImgs = [data.imageSrc]
      if (Array.isArray(data.swiperImages)) {
        swiperImgs.push(...data.swiperImages)
      }

      // 加载购物车
      let amount = 0;
      if (userInfo._id) {
        userInfo.cart.forEach(element => {
          if (element._id === data._id) {
            amount = element.amount
          }
        })
      }

      // 加载支持的陪玩列表
      const availablePartnerIDs = data.availablePartners
      let finalRes = []

      if (availablePartnerIDs.length !== 0) {
        const promises = availablePartnerIDs.map(id =>
          db.collection('partners').doc(id).get()
        )
        const results = await Promise.all(promises)
        const partnersDataOriginal = results
          .filter(r => r.data) // 过滤 null
          .map(r => r.data) // 提取 data
          .filter(r => r.isAvailable) // 符合条件的陪玩
          .map(({
            password,
            ...res
          }) => res) // 剔除 password 字段
        
        if (partnersDataOriginal.length !== 0) {
          const finalResOriginal = await wx.cloud.callFunction({
            name: 'src_CloudToHttp',
            data: {
              status: 'partners',
              partnersDataOriginal: partnersDataOriginal
            }
          })
          finalRes = finalResOriginal.result.partnersData
        }
      }

      // 加载评论
      const orders = await db.collection('orders').where({
        goodID: data._id,
        isCommented: true
      })
      .orderBy('createTime', 'desc') // 按时间降序
      .limit(10) // 限制 10 条
      .get()
      let commentList = []

      if (orders.data.length > 0) {
        const openids = [...new Set(orders.data.map(item => item._openid))]
        const userRes = await db.collection('users').where({
          openid: db.command.in(openids)
        }).get()

        const userMap = {}
        userRes.data.forEach(user => {
          userMap[user.openid] = {
            username: user.username,
            consumption: user.consumption
          }
        })

        commentList = orders.data.map(order => ({
          username: userMap[order._openid].username,
          consumption: userMap[order._openid].consumption,
          content: order.comment,
          time: formatDate(order.createTime),
          badgeColor: this.getBadgeColor(userMap[order._openid].consumption),
        }))
      }
      
      wx.hideLoading()

      this.setData({
        goodData: data,
        swiperImgs: swiperImgs,
        isShowSwiperImgs: true,
        availablePartners: finalRes,
        commentList: commentList,
        inCartAmount: amount
      })
    }

    wx.showLoading({
      title: '加载中'
    })
    if (sharedGoodID) {
      this.setData({ dataSource: 0 })
      wx.cloud.callFunction({
        name: 'searchGoods',
        data: { id: sharedGoodID },
        success: (res) => {
          if (res.result.success) {
            processGoodData(res.result.goodData)
          } else {
            wx.showToast({ title: '商品不存在', icon: 'none' })
          }
        },
        fail: () => {
          wx.showToast({ title: '加载失败', icon: 'none' })
        }
      })
    } else {
      this.setData({ dataSource: 1 })
      const eventChannel = this.getOpenerEventChannel()
      eventChannel.on('acceptDataFromGoodPage', (data) => {
        processGoodData(data.goodData)
      })
    }
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
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: `向您分享xiaodi电竞的 ${this.data.goodData.name}`,
      path: 'pages/goodDetail/detail?id=' + this.data.goodData._id,
      imageUrl: this.data.goodData.imageSrc
    }
  },
  onShareTimeline() {
    return {
      title: `向您推荐xiaodi电竞的 ${this.data.goodData.name}`,
      query: `id=${this.data.goodData._id}`,
      imageUrl: this.data.goodData.imageSrc
    }
  },
  async addToCart() {
    const app = getApp()
    const userInfo = app.appData.userInfo

    if (!userInfo._id) {
      wx.showToast({
        title: '登录后可使用此功能',
        icon: 'none'
      })
      return;
    }

    wx.showLoading({
      title: '加载中'
    })

    const res = await wx.cloud.callFunction({
      name: 'cartManager',
      data: {
        goodID: this.data.goodData._id,
        amount: 1,
        userID: userInfo._id,
        action: 'add'
      }
    })

    const target = userInfo.cart.find(item => item._id === this.data.goodData._id)
    if (target) {
      target.amount += 1
    } else {
      const newGood = {
        _id: this.data.goodData._id,
        amount: 1
      }
      userInfo.cart.push(newGood)
    }

    wx.hideLoading()
    if (res.result.success) {
      wx.showToast({
        title: '已添加至购物车',
        icon: 'none'
      })
    } else {
      wx.showToast({
        title: res.result.errMsg,
        icon: 'error'
      })
    }

    setTimeout(() => {
      if (this.data.dataSource === 1) {
        wx.navigateBack({
          delta: 1
        })
      } else if (this.data.dataSource === 0) {
        wx.switchTab({
          url: '/pages/index/index'
        })
      }
    }, 2000)
  },
  previewImages() {
    wx.previewImage({
      current: this.data.swiperImgs[0],
      urls: this.data.swiperImgs
    })
  },
  async increaseCart() {
    const app = getApp()
    const userInfo = app.appData.userInfo

    if (this.data.inCartAmount <= 0) {
      return;
    }

    const good = {
      ...this.data.goodData,
      amount: this.data.inCartAmount
    }

    wx.showLoading({ title: '加载中' })

    // 数据库
    await wx.cloud.callFunction({
      name: 'cartManager',
      data: {
        userID: userInfo._id,
        action: 'add',
        goodID: good._id,
        amount: 1
      }
    })
    // 本地
    const existing = userInfo.cart.find(item => item._id === good._id)
    existing.amount += 1
    this.setData({
      inCartAmount: existing.amount
    })

    wx.hideLoading()
  },
  async decreaseCart() {
    const app = getApp()
    const userInfo = app.appData.userInfo

    if (this.data.inCartAmount <= 1) {
      wx.showToast({
        title: '请前往购物车删减',
        icon: 'none'
      })
      return;
    }

    const good = {
      ...this.data.goodData,
      amount: this.data.inCartAmount
    }

    if(good.amount === 1){
      return;
    }

    wx.showLoading({ title: '加载中' })

    // 数据库
    await wx.cloud.callFunction({
      name: 'cartManager',
      data: {
        userID: userInfo._id,
        action: 'delete',
        goodID: good._id,
        amount: 1
      }
    })
    // 本地
    const existing = userInfo.cart.find(item => item._id === good._id)
    existing.amount -= 1
    this.setData({
      inCartAmount: existing.amount
    })

    wx.hideLoading()
  },
  ToPartnerDetail(e) {
    const that = this
    const index = e.currentTarget.dataset.index

    wx.navigateTo({
      url: '/pages/aboutPartner/index',
      success: function (res) {
        res.eventChannel.emit('acceptDataFromOpenerPage', {
          partnerData: that.data.availablePartners[index]
        })
      }
    })
  },
  getBadgeColor(totalSpent) {
    if (totalSpent >= 100) {
      return '#E0115F'; // 深粉/红宝石
    } else if (totalSpent >= 50) {
      return '#FFD700'; // 亮金色
    } else if (totalSpent >= 10) {
      return '#C0C0C0'; // 银色
    } else {
      return '#CD7F32'; // 青铜色
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