// pages/orderDetail/detail.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    order: {},
    statusText: {
      pending: '待确认',
      confirmed: '已确认',
      completed: '已完成',
      cancelled: '已取消'
    },
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    const that = this;
    const eventChannel = this.getOpenerEventChannel()
    eventChannel.on('acceptDataFromOpenerPage', function (data) {
      that.setData({
        order: data.orderData
      })
    })
  },
  onReady() {
    wx.setScreenBrightness({
      value: 1
    })
  },
  reorder() {
    const order = this.data.order;
    wx.navigateTo({
      url: '/pages/placeOrder/index',
      success: function (res) {
        res.eventChannel.emit('acceptDataFromOpenerPage', {
          totalCount: order.amount,
          totalPrice: order.amount * order.goodData.price,
          selectGoods: [{
            ...order.goodData,
            amount: order.amount
          }]
        })
      }
    })
  },
  ToAboutPartner() {
    wx.navigateTo({
      url: `/pages/aboutPartner/index?id=${this.data.order.partner._id}`
    })
  },
  copyOrderID(e) {
    const orderID = e.currentTarget.dataset.id
    wx.setClipboardData({
      data: orderID
    })
  },
  showPartnerDetail() {
    const partner = this.data.order.partner
    wx.showModal({
      title: `${partner.nickname}的公开信息`,
      content: `手机号: ${partner.phoneNumber}\nOPENID: ${partner.openid}`,
      showCancel: false
    })
  }
})