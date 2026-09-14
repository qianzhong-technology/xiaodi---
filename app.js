// app.js
App({
  onLaunch() {
    wx.cloud.init({
      env: "cloud1-d4g47p17w6eac6cc1",
      traceUser: true
    })
  },
  appData: {
    userInfo: {}
  }
})
