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
    userId,
    isAvailable
  } = event

  if (!wxContext.OPENID) return { success: false, errMsg: '未认证用户' }
  if (typeof userId !== 'string' || !userId || typeof isAvailable !== 'boolean') {
    return { success: false, errMsg: '参数错误' }
  }
  // 鉴权
  const adminRes = await db.collection('users').where({
    openid: wxContext.OPENID
  }).get()
  if (!adminRes.data[0] || adminRes.data[0].isAdmin !== true || adminRes.data[0].isAvailable !== true) {
    return {
      success: false,
      errMsg: '无权限操作'
    }
  }

  const transaction = await db.startTransaction()
  try {
    const admin = (await transaction.collection('users').doc(adminRes.data[0]._id).get()).data
    if (!admin || admin.openid !== wxContext.OPENID || admin.isAdmin !== true || admin.isAvailable !== true) {
      throw new Error('无权限操作')
    }
    await transaction.collection('users').doc(userId).update({
      data: {
        isAvailable: isAvailable
      }
    })
    await transaction.collection('auditLogs').add({
      data: { actor: wxContext.OPENID, action: 'toggleBanUser', target: userId, isAvailable, createdAt: db.serverDate() }
    })
    await transaction.commit()
    return {
      success: true,
      errMsg: '成功'
    }
  } catch (err) {
    await transaction.rollback()
    return {
      success: false,
      errMsg: err.message
    }
  }
}