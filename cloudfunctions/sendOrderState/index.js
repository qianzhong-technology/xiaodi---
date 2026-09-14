// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

exports.main = async (event, context) => {
  const {
    touser,
    orderID,
    orderContent,
    orderState,
    partners,
    startTime
  } = event

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      "touser": touser,
      "page": `pages/order/index?id=${orderID}`,
      "lang": 'zh_CN',
      "data": {
        "thing1": {
          "value": orderContent
        },
        "phrase2": {
          "value": orderState
        },
        "thing35": {
          "value": partners
        },
        "time19": {
          "value": startTime
        }
      },
      "templateId": 'JoS7GlcVBEug3m2s7Gv2hjbUn8WHyX9CNKt5zBy82_Q',
      "miniprogramState": 'trial'
    })

    if (result.errCode === 0) {
      return {
        success: true,
        errMsg: '发送成功'
      }
    } else {
      return {
        success: false,
        errMsg: result.errMsg
      }
    }
  } catch (err) {
    return {
      success: false,
      errMsg: err
    }
  }
}