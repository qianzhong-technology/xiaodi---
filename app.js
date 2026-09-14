// app.js
App({
  onLaunch() {
    wx.cloud.init({
      env: "",
      traceUser: true
    })
  },
  appData: {
    userInfo: {}
  }
})
