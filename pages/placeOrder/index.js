// pages/placeOrder/index.js
const db = wx.cloud.database()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    contactPhone: '',
    selectedGoods: [],
    totalCount: 0,
    totalPrice: 0,
    remark: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    const that = this;

    const app = getApp()
    const userInfo = app.appData.userInfo
    const eventChannel = this.getOpenerEventChannel()

    if (!userInfo._id) return;

    eventChannel.on('acceptDataFromOpenerPage', async function (data) {
      const enrichedGoods = await Promise.all(
        data.selectGoods.map(async (item) => {
          // 获取该商品支持的陪玩ID列表
          const partnerIds = item.availablePartners

          // 并发查询所有陪玩信息
          const partnerPromises = partnerIds.map(id =>
            db.collection('partners').doc(id).get()
          )
          const partnerResults = await Promise.all(partnerPromises)

          const partners = partnerResults
            .filter(r => r.data)
            .map(r => r.data)
            .filter(r => r.isAvailable && r.isOnline) // 在线
            .map(({
              password,
              ...res
            }) => res) // 剔除 password 字段

          if (partners.length === 0) {
            wx.showModal({
              title: '提示',
              content: '当前无陪玩在线,请您耐心等候',
              showCancel: false
            })
          }

          return {
            ...item,
            availablePartners: partners,
            selectedPartnerIndex: -1
          }
        })
      )

      that.setData({
        contactPhone: userInfo.phoneNumber,
        selectedGoods: enrichedGoods,
        totalPrice: data.totalPrice,
        totalCount: data.totalCount
      })
    })
  },
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    })
  },
  onPartnerChange(e) {
    const {
      id
    } = e.currentTarget.dataset

    // 更新
    const selectedGoods = this.data.selectedGoods.map(item => {
      if (item._id === id) {
        return {
          ...item,
          selectedPartnerIndex: Number(e.detail.value)
        }
      }
      return item
    })

    this.setData({
      selectedGoods
    })
  },
  async submitOrder() {
    const selectedGoods = this.data.selectedGoods
    // 1. 前置校验
    if (selectedGoods.length === 0) {
      wx.showToast({ title: '没有可结算的商品', icon: 'none' })
      return
    }
    for (const item of selectedGoods) {
      const partners = item.availablePartners
      const idx = item.selectedPartnerIndex
      if (!partners[idx]) {
        wx.showToast({ title: `请为「${item.name}」选择陪玩`, icon: 'none' })
        return
      }
    }
  
    wx.showLoading({ title: '提交中...' })
    const db = wx.cloud.database()
  
    // 2. 并发写入订单
    const orders = await Promise.all(
      selectedGoods.map(item => {
        const partners = item.availablePartners
        const idx = item.selectedPartnerIndex
        return db.collection('orders').add({
          data: {
            amount: item.amount,
            comment: '',
            createTime: db.serverDate(),
            goodID: item._id,
            isCommented: false,
            isConfirm: false,
            isPay: false,
            partner: partners[idx],
            remark: this.data.remark,
            status: 'unpaid'
          }
        })
      })
    )
  
    const orderIDs = orders.map(orderResult => orderResult._id)
  
    // 3. 调用云函数获取支付参数
    const res = await wx.cloud.callFunction({
      name: 'getPrePayment',
      data: {
        totalPrice: this.data.totalPrice,
        orderIDs: orderIDs
      }
    })
    const payment = res.result
  
    // 4. 调起微信支付
    let paySuccess = false
    try {
      await wx.requestPayment(payment)
      paySuccess = true
    } catch (err) {
      // 支付失败或取消
      wx.hideLoading()
      if (err.errMsg && err.errMsg.indexOf('cancel') !== -1) {
        wx.showToast({ title: '订单待支付', icon: 'none' })
      } else {
        wx.showToast({ title: '支付失败', icon: 'none' })
      }
    }
  
    // 5. 只有支付成功才删除购物车
    if (paySuccess) {
      const app = getApp()
      const userInfo = app.appData.userInfo
      if (userInfo && userInfo._id) {
        const orderedGoodIDs = selectedGoods.map(g => g._id)
        // 从数据库删除
        await wx.cloud.callFunction({
          name: 'cartManager',
          data: {
            userID: userInfo._id,
            action: 'delete',
            goodIDs: orderedGoodIDs
          }
        })
        // 从本地缓存删除
        userInfo.cart = userInfo.cart.filter(c => !orderedGoodIDs.includes(c._id))
        app.appData.userInfo = userInfo
      }
      wx.hideLoading()
    }
  
    // 6. 跳转到订单页（待支付列表）
    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/order/index?openType=pendings'
      })
    }, 1500)
  },
  async onSubscribeOrder() {
    const TMPL_ID = 'JoS7GlcVBEug3m2s7Gv2hjbUn8WHyX9CNKt5zBy82_Q'
    const res = await new Promise((resolve, reject) => {
      wx.requestSubscribeMessage({
        tmplIds: [TMPL_ID],
        success: resolve,
        fail: reject
      })
    })
    if (res[TMPL_ID] === 'accept') {
      this.submitOrder()
    } else {
      wx.showModal({
        title: '提示',
        content: '请订阅订单状态,方便我们提供更好的服务',
        showCancel: false
      })
    }
  }
})