// pages/order/index.js
const db = wx.cloud.database()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    openType: '',
    statusText: {
      unpaid: '待支付',
      pending: '待确认',
      confirmed: '已确认',
      completed: '已完成',
      cancelled: '已取消'
    },
    orderList: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.id) {
      const orderID = options.id
      this.searchOrders({
        orderID: orderID
      })
      this.setData({
        openType: 'orders'
      })
      return;
    }

    if (options.openType) {
      const query = {
        isConfirm: options.openType === 'orders'
      }
      this.searchOrders(query)
      this.setData({
        openType: options.openType
      })
      return;
    }
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
  onPullDownRefresh() {

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

  },
  switchTab(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      openType: type
    })

    // 更新订单列表
    const query = {
      isConfirm: type === 'orders'
    }
    this.searchOrders(query)
  },
  async searchOrders(e) {
    const db = wx.cloud.database()
    const {
      status,
      orderID,
      name,
      isConfirm
    } = e

    wx.showLoading({
      title: '加载中'
    })

    try {
      let data = []

      if (orderID) {
        try {
          const res = await db.collection('orders').doc(orderID).get()
          data = [res.data]
        } catch (err) {
          data = []
        }
      } else {
        const app = getApp()
        const userInfo = app.appData.userInfo

        const query = {
          _openid: userInfo.openid
        }
        if (status) {
          query.status = status
        }
        if (isConfirm !== undefined) {
          query.isConfirm = isConfirm
        }
        if (name) {
          const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          query.orderName = db.RegExp({
            regexp: escapedName,
            options: 'i'
          })
        }

        const res = await db.collection('orders')
          .where(query)
          .orderBy('createTime', 'desc')
          .get()

        data = res.data
      }

      if (data.length > 0) {
        // 1. 收集所有不重复的 goodID
        const _ = db.command
        const goodIDs = [...new Set(data.map(item => item.goodID))]

        // 2. 一次查出来
        const goodsRes = await db.collection('goods')
          .where({
            _id: _.in(goodIDs)
          })
          .get()

        // 3. 获取临时图片地址
        const finalGoodsRes = await wx.cloud.callFunction({
          name: 'src_CloudToHttp',
          data: {
            goodDataOriginal: goodsRes.data,
            status: 'goods'
          }
        })

        // 4. 建一个 Map 方便快速查找
        const goodsMap = {}
        finalGoodsRes.result.goodData.forEach(g => {
          goodsMap[g._id] = g
        })

        // 5. 挂回去
        data.forEach(item => {
          if (goodsMap[item.goodID]) {
            item.goodData = goodsMap[item.goodID]
          }

          if (item.createTime && item.createTime instanceof Date) {
            item.createTime = formatDate(item.createTime)
          }

          if(item.payTime && item.payTime instanceof Date) {
            item.payTime = formatDate(item.payTime)
          }
        })

        // 6. 前端
        this.setData({
          orderList: data
        })
      } else {
        this.setData({
          orderList: []
        })
      }
      wx.hideLoading()
    } catch (err) {
      return {
        success: false,
        errMsg: '查询失败，请重试'
      }
    }
  },
  async cancelOrder(e) {
    const id = e.currentTarget.dataset.id
    const order = this.data.orderList.find(item => item._id === id)

    const app = getApp()
    const userInfo = app.appData.userInfo

    const now = new Date()
    const formatted = formatDate(now)

    const res = await wx.showModal({
      title: '提示',
      content: '确认取消订单?'
    })
    if (res.confirm) {
      wx.showLoading({
        title: '加载中'
      })

      const good = await db.collection('goods').doc(order.goodID).get()
      await wx.cloud.callFunction({
        name: 'changeOrderState',
        data: {
          orderID: id,
          status: 'cancelled'
        }
      })
      await wx.cloud.callFunction({
        name: 'sendOrderState',
        data: {
          touser: userInfo.openid,
          orderID: id,
          orderContent: good.data.name,
          orderState: '已取消',
          partners: '无',
          startTime: formatted
        }
      })

      wx.hideLoading()

      // 更新订单列表
      const query = {
        isConfirm: this.data.openType === 'orders'
      }
      this.searchOrders(query)
    }
  },
  async deleteOrder(e) {
    const id = e.currentTarget.dataset.id
    const res = await wx.showModal({
      title: '提示',
      content: '确认删除订单?'
    })

    if (res.confirm) {
      await db.collection('orders').doc(id).remove()

      // 更新订单列表
      const query = {
        isConfirm: this.data.openType === 'orders'
      }
      this.searchOrders(query)
    }
  },
  reorder(e) {
    const orderID = e.currentTarget.dataset.id
    const order = this.data.orderList.find(item => item._id === orderID)

    wx.navigateTo({
      url: `/pages/goodDetail/detail?id=${order.goodData._id}`
    })
  },
  async commentOrder(e) {
    const orderID = e.currentTarget.dataset.id
    const res = await wx.showModal({
      title: '订单评价',
      placeholderText: '留下您的宝贵意见!',
      editable: true,
      confirmText: '发表'
    })
    if (res.confirm) {
      if (res.content.length === 0) {
        wx.showToast({
          title: '请输入要评论的内容',
          icon: 'none'
        })
        return;
      }

      await db.collection('orders').doc(orderID).update({
        data: {
          isCommented: true,
          comment: res.content
        }
      })
      wx.showToast({
        title: '发表成功',
        icon: 'success',
        duration: 2000
      })
      setTimeout(() => {
        // 更新订单列表
        const query = {
          isConfirm: this.data.openType === 'orders'
        }
        this.searchOrders(query)
      }, 2000)
    }
  },
  ToOrderDetail(e) {
    const index = e.currentTarget.dataset.index
    const order = this.data.orderList[index]
    if (!order.isPay) {
      wx.showToast({
        title: '前往订单详情页需支付',
        icon: 'none'
      })
      return;
    }

    wx.navigateTo({
      url: '/pages/orderDetail/detail',
      success: function (res) {
        res.eventChannel.emit('acceptDataFromOpenerPage', {
          orderData: order
        })
      }
    })
  },
  async payOrder(e) {
    const index = e.currentTarget.dataset.index
    const order = this.data.orderList[index]
    if (order.isPay) return;

    wx.showLoading({
      title: '加载中'
    })
    // 调用云函数获取支付参数
    const res = await wx.cloud.callFunction({
      name: 'getPrePayment',
      data: {
        totalPrice: order.amount * order.goodData.price,
        orderIDs: [order._id]
      }
    })
    const payment = res.result

    // 调起微信支付
    try {
      await wx.requestPayment(payment)
    } catch (err) {
      // 支付失败或取消
      wx.hideLoading()
      if (err.errMsg && err.errMsg.indexOf('cancel') !== -1) {
        wx.showToast({
          title: '订单待支付',
          icon: 'none'
        })
      } else {
        wx.showToast({
          title: '支付失败',
          icon: 'none'
        })
      }
    }

    setTimeout(() => {
      // 更新订单列表
      const query = {
        isConfirm: this.data.openType === 'orders'
      }
      this.searchOrders(query)
    }, 2000)
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