// pages/index/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    goodList: {},
    isShowGoods: false,
    isShowFilter: false,
    priceRange: [],
    playTimeRange: [],
    inputMinPrice: -1,
    inputMaxPrice: -1,
    inputMinPlayTime: -1,
    inputMaxPlayTime: -1
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    // 推荐商品
    this.getRecommendGoods()

    // 拉取属性范围
    this.getGoodsPropertyRange()
  },
  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  async onPullDownRefresh() {
    try {
      await Promise.all([
        this.getRecommendGoods(),
        this.getGoodsPropertyRange()
      ])
      wx.showToast({
        title: '刷新成功',
        icon: 'none'
      })
    } catch (err) {
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      })
    } finally {
      wx.stopPullDownRefresh()
    }
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
      title: 'xiaodi电竞',
      path: 'pages/index/index',
      imageUrl: '/images/logo.png'
    }
  },
  searchGoods(){
    var result = this.VerifyInput();
    if(!result.success){
      var message = "";
      for(let i = 0; i < result.errMsg.length; i++){
        message += (i + 1) + '. ' + result.errMsg[i] + '; '
      }
      wx.showModal({
        title: '提示',
        content: message,
        showCancel: false
      })
      return;
    }

    var that = this;

    wx.showLoading({
      title: '搜索中'
    })
    wx.cloud.callFunction({
      name: 'searchGoods',
      data: {
        playTime: [this.data.inputMinPlayTime, this.data.inputMaxPlayTime],
        price: [this.data.inputMinPrice, this.data.inputMaxPrice]
      },
      success(res){
        wx.hideLoading()
        if(!res.result.success){
          wx.showModal({
            title: '提示',
            content: '未找到合适的商品',
            showCancel: false
          })
          return;
        }
        that.setData({
          goodList: res.result.availableGoods,
          isShowGoods: true
        })
      }
    })
  },
  bindMinPrice: function(e) {
    var value = Number(e.detail.value);
    if(!Number.isFinite(value)) return;
    this.setData({
      inputMinPrice: value
    })
  },
  bindMaxPrice: function(e) {
    var value = Number(e.detail.value);
    if(!Number.isFinite(value)) return;
    this.setData({
      inputMaxPrice: value
    })
  },
  bindMinPlayTime: function(e) {
    var value = Number(e.detail.value);
    if(!Number.isFinite(value)) return;
    this.setData({
      inputMinPlayTime: value
    })
  },
  bindMaxPlayTime: function(e) {
    var value = Number(e.detail.value);
    if(!Number.isFinite(value)) return;
    this.setData({
      inputMaxPlayTime: value
    })
  },
  VerifyInput(){
    var priceRange = [this.data.inputMinPrice, this.data.inputMaxPrice]
    var playTimeRange = [this.data.inputMinPlayTime, this.data.inputMaxPlayTime]
    var result = {errMsg: [], success: true};

    // price
    if(priceRange[0] == 0 || priceRange[1] == 0){
      result.errMsg.push("请输入要筛选的价格区间")
      result.success = false;
      return result;
    }

    if(priceRange[0] < this.data.priceRange[0]){
      result.errMsg.push("不能低于最低价格")
      result.success = false;
    }
    if(priceRange[1] > this.data.priceRange[1]){
      result.errMsg.push("不能高于最高价格")
      result.success = false;
    }
    if(priceRange[0] > priceRange[1]){
      result.errMsg.push("最低金额不能大于最高金额")
      result.success = false;
    }

    // playTime
    if(playTimeRange[0] == 0 || playTimeRange[1] == 0){
      result.errMsg.push("请输入要筛选的时长区间")
      result.success = false;
      return result;
    }

    if(playTimeRange[0] < this.data.playTimeRange[0]){
      result.errMsg.push("不能低于最低时长")
      result.success = false;
    }
    if(playTimeRange[1] > this.data.playTimeRange[1]){
      result.errMsg.push("不能高于最高时长")
      result.success = false;
    }
    if(playTimeRange[0] > playTimeRange[1]){
      result.errMsg.push("最低时长不能大于最高时长")
      result.success = false;
    }

    return result;
  },
  async getGoodsPropertyRange() {
    const res = await wx.cloud.callFunction({
      name: 'getGoodsPropertyRange'
    })
    const result = res.result
    this.setData({
      priceRange: [result.minPrice, result.maxPrice],
      playTimeRange: [result.minPlayTime, result.maxPlayTime],
      inputMinPrice: result.minPrice,
      inputMaxPrice: result.maxPrice,
      inputMinPlayTime: result.minPlayTime,
      inputMaxPlayTime: result.maxPlayTime
    })
  },
  async getRecommendGoods() {
    wx.showLoading({
      title: '加载商品中'
    })

    const res = await wx.cloud.callFunction({
      name: 'recommendGoods',
      data: {
        quantity: 10
      }
    })
    this.setData({
      goodList: res.result.goodData,
      isShowGoods: true
    })

    wx.hideLoading()
  },
  hideFilter() {
    this.setData({
      isShowFilter: false
    })
  },
  showFilter() {
    this.setData({
      isShowFilter: true
    })
  }
})