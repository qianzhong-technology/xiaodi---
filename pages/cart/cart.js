// pages/cart/cart.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    cartList: [],
    isAllChecked: false,
    isEditing: false,
    totalPrice: 0,
    totalCount: 0
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.updateCart()
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
    try {
      await this.updateCart()
    } catch (err) {
      wx.showToast({
        title: err,
        icon: 'none'
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    })
  },
  async updateCart() {
    const app = getApp()
    const userInfo = app.appData.userInfo

    if (!userInfo || !userInfo._id) {
      this.setData({ cartList: [] })
      wx.showToast({ title: '登录后可使用此功能', icon: 'none' })
      return;
    }
  
    const db = wx.cloud.database()
    const cartData = userInfo.cart
  
    if (cartData.length === 0) {
      this.setData({ cartList: [] })
      return;
    }

    wx.showLoading({
      title: '加载中'
    })

    // 并发查询
    const newCartList = await Promise.all(
      cartData.map(async (element) => {
        const res = await db.collection('goods').doc(element._id).get()
        return {
          ...res.data,
          amount: element.amount,
          checked: false
        }
      })
    )

    const res = await wx.cloud.callFunction({
      name: 'src_CloudToHttp',
      data: {
        goodDataOriginal: newCartList,
        status: 'goods'
      }
    })

    wx.hideLoading()

    this.setData({
      cartList: res.result.goodData,
      totalCount: 0,
      totalPrice: 0,
      isAllChecked: false,
      isEditing: false
    })
  },
  toggleCheck(e) {
    const index = e.currentTarget.dataset.index
    const target = this.data.cartList[index]

    if (!target.isAvailable && !this.data.isEditing) return;

    const checked = !target.checked
    const key = `cartList[${index}].checked`

    if (!this.data.isEditing) {
      let price = this.data.totalPrice;
      let count = this.data.totalCount;
      if (checked) {
        price += target.price * target.amount
        count += target.amount
      } else {
        price -= target.price * target.amount
        count -= target.amount
      }

      this.setData({
        [key]: checked,
        totalPrice: price,
        totalCount: count
      })
    } else {
      let count = this.data.totalCount;
      if (checked) {
        count += 1
      } else {
        count -= 1
      }

      this.setData({
        [key]: checked,
        totalCount: count
      })
    }
    // 处理手动全选
    let isAllChecked;
    const checkedItems = this.data.cartList.filter(item => item.checked)
    if (checkedItems.length === this.data.cartList.length) {
      isAllChecked = true
    } else {
      isAllChecked = false
    }
    this.setData({
      isAllChecked: isAllChecked
    })
  },
  toggleAllCheck() {
    const checked = !this.data.isAllChecked
    const newCartList = this.data.cartList.map(item => {
      if (!item.isAvailable && !this.data.isEditing) {
        return item;
      }
      return {
        ...item,
        checked: checked
      }
    })
    
    if (!this.data.isEditing) {
      let price = 0;
      let count = 0;
      if (checked) {
        this.data.cartList.forEach(item => {
          if (!item.isAvailable) return;
          price += item.price * item.amount
          count += item.amount
        })
      }

      this.setData({
        isAllChecked: checked,
        cartList: newCartList,
        totalPrice: price,
        totalCount: count
      })
    } else {
      let count = 0;
      if (checked) {
        count = newCartList.length
      }

      this.setData({
        cartList: newCartList,
        isAllChecked: checked,
        totalCount: count
      })
    }
  },
  toggleEdit() {
    this.clearAllCheckedFlag()
    this.setData({
      isEditing: !this.data.isEditing
    })
  },
  clearAllCheckedFlag() {
    const newCartList = this.data.cartList.map(item => ({
      ...item,
      checked: false
    }))
    this.setData({
      cartList: newCartList,
      isAllChecked: false,
      totalPrice: 0,
      totalCount: 0
    })
  },
  toDetail(e) {
    var that = this;
    const index = e.currentTarget.dataset.index

    if(!this.data.cartList[index].isAvailable){
      return;
    }
    wx.navigateTo({
      url: '/pages/goodDetail/detail',
      success: function (res) {
        res.eventChannel.emit('acceptDataFromGoodPage', {
          goodData: that.data.cartList[index]
        })
      }
    })
  },
  checkout() {
    if(this.data.totalCount === 0 || this.data.totalPrice === 0){
      wx.showToast({
        title: '请选择物品后结算',
        icon: 'none'
      })
      return;
    }

    const that = this;
    wx.showModal({
      title: '结算',
      content: `您本次总计消费￥${this.data.totalPrice},是否结算?`,
      success(res){
        if(res.confirm){
          // 结算
          const checkedGoods = that.data.cartList.filter(item => item.checked)

          wx.navigateTo({
            url: '/pages/placeOrder/index',
            success: function(res) {
              res.eventChannel.emit('acceptDataFromOpenerPage', {
                totalCount: that.data.totalCount,
                totalPrice: that.data.totalPrice,
                selectGoods: checkedGoods
              })
            }
          })
        }
      }
    })
  },
  async deleteSelected() {
    const app = getApp()
    const userInfo = app.appData.userInfo
    const checkedItems = this.data.cartList.filter(item => item.checked)
  
    if (checkedItems.length === 0) return;
  
    const goodIDs = checkedItems.map(item => item._id)

    wx.showLoading({
      title: '加载中'
    })

    const res = await wx.cloud.callFunction({
      name: 'cartManager',
      data: {
        userID: userInfo._id,
        action: 'delete',
        goodIDs: goodIDs
      }
    })

    wx.hideLoading()
    if (res.result.success) {
      // 本地刷新
      const newCart = userInfo.cart.filter(item => !goodIDs.includes(item._id))
      userInfo.cart = newCart
      await this.updateCart()

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
    }
  },
  async increaseAmount(e) {
    wx.showLoading({ title: '加载中' })
    const app = getApp()
    const userInfo = app.appData.userInfo
    const id = e.currentTarget.dataset.id

    // 数据库
    await wx.cloud.callFunction({
      name: 'cartManager',
      data: {
        userID: userInfo._id,
        action: 'add',
        goodID: id,
        amount: 1
      }
    })
    // 本地
    const existing = userInfo.cart.find(item => item._id === id)
    existing.amount += 1
    wx.hideLoading()

    // 刷新
    await this.updateCart()
    this.clearAllCheckedFlag()
  },
  async decreaseAmount(e) {
    const app = getApp()
    const userInfo = app.appData.userInfo
    const id = e.currentTarget.dataset.id
    const good = userInfo.cart.find(item => item._id === id)

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
        goodID: id,
        amount: 1
      }
    })
    // 本地
    const existing = userInfo.cart.find(item => item._id === id)
    existing.amount -= 1
    wx.hideLoading()

    // 刷新
    await this.updateCart()
    this.clearAllCheckedFlag()
  }
})