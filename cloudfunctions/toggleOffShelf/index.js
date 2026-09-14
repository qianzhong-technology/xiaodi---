// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const {
    goodId,
    isAvailable
  } = event

  // 鉴权
  const adminRes = await db.collection('users').where({
    openid: wxContext.OPENID
  }).get()
  if (!adminRes.data[0] || !adminRes.data[0].isAdmin) {
    return {
      success: false,
      errMsg: '无权限操作'
    }
  }

  try {
    await db.collection('goods').doc(goodId).update({
      data: {
        isAvailable: isAvailable
      }
    })
    return {
      success: true,
      errMsg: '成功'
    }
  } catch (err) {
    return {
      success: false,
      errMsg: err.message
    }
  }
}