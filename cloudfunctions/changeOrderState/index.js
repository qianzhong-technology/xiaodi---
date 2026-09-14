// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  let isConfirm = true
  const {
    orderID,
    status
  } = event

  if (status === 'pending') {
    isConfirm = false
  }

  await db.collection('orders').doc(orderID).update({
    data: {
      isConfirm: isConfirm,
      status: status
    }
  })
}