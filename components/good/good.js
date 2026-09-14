// components/good/good.js
Component({

  /**
   * 组件的属性列表
   */
  properties: {
    goodData: {
      type: Object,
      value: {}
    },
    index: {
      type: Number,
      value: 0
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    toDetail(){
      var that = this;
      wx.navigateTo({
        url: '/pages/goodDetail/detail',
        success: function(res){
          res.eventChannel.emit('acceptDataFromGoodPage', {
            goodData: that.data.goodData
          })
        }
      })
    },
    async addToCart() {
      const app = getApp()
      const userInfo = app.appData.userInfo;

      if(!userInfo._id){
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
    }
  }
})