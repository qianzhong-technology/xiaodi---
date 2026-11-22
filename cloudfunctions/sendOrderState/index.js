// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})
const db = cloud.database()

exports.main = async (event, context) => {
  const {
    touser,
    orderID,
    orderContent,
    orderState,
    partners,
    startTime
  } = event

  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { success: false, errMsg: '未认证用户' }
  if (typeof orderID !== 'string' || !orderID) return { success: false, errMsg: '参数错误' }

  try {
    const order = (await db.collection('orders').doc(orderID).get()).data
    const states = { cancelled: '已取消', confirmed: '已确认', completed: '已完成' }
    if (!order || order._openid !== touser || states[order.status] !== orderState) {
      return { success: false, errMsg: '无权限操作' }
    }
    const users = await db.collection('users').where({ openid: OPENID, isAvailable: true }).limit(1).get()
    const partners = await db.collection('partners').where({ openid: OPENID, isAvailable: true }).limit(1).get()
    const user = users.data[0]
    const partner = partners.data[0]
    if (!(user && (order._openid === OPENID || user.isAdmin === true)) &&
        !(partner && order.partner && partner._id === order.partner._id)) {
      return { success: false, errMsg: '无权限操作' }
    }
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
      "templateId": '',
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