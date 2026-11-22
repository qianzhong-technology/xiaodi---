// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const {
    partnerID,
    status
  } = event

  if (!OPENID) return { success: false, errMsg: '未认证用户' }
  if (typeof partnerID !== 'string' || !partnerID || typeof status !== 'boolean') {
    return { success: false, errMsg: '参数错误' }
  }
  const transaction = await db.startTransaction()
  try {
    const ref = transaction.collection('partners').doc(partnerID)
    const partner = (await ref.get()).data
    if (!partner || partner.openid !== OPENID || partner.isAvailable !== true) {
      throw new Error('无权限操作')
    }
    await ref.update({ data: { isOnline: status } })
    await transaction.collection('auditLogs').add({
      data: { actor: OPENID, action: 'toggleChangeOnline', target: partnerID, status, createdAt: db.serverDate() }
    })
    await transaction.commit()
    return { success: true }
  } catch (err) {
    await transaction.rollback()
    return { success: false, errMsg: err.message }
  }
}