// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { status, goodID, partnerID } = event
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { success: false, errMsg: '未认证用户' }
  if (typeof goodID !== 'string' || !goodID || typeof partnerID !== 'string' || !partnerID ||
      !['add', 'delete'].includes(status)) {
    return { success: false, errMsg: '参数错误' }
  }
  const transaction = await db.startTransaction()
  try {
    const currentPartner = await transaction.collection('partners').doc(partnerID).get()
    if (!currentPartner.data || currentPartner.data.openid !== OPENID || currentPartner.data.isAvailable !== true) {
      throw new Error('无权限操作')
    }
    const goodRef = transaction.collection('goods').doc(goodID)
    const goodDoc = await goodRef.get()
    const good = goodDoc.data

    if (!good) throw new Error('无此商品')

    const partners = good.availablePartners

    switch (status) {
      case 'add':
        if (partners.includes(partnerID)) {
          throw new Error('已添加,请勿重复添加')
        }
        partners.push(partnerID)
        await goodRef.update({ data: { availablePartners: partners } })
        break

      case 'delete':
        if (!partners.includes(partnerID)) {
          throw new Error('无此陪玩,请查证陪玩ID')
        }
        const newPartners = partners.filter(item => item !== partnerID)
        await goodRef.update({ data: { availablePartners: newPartners } })
        break

      default:
        throw new Error('未知参数')
    }
    await transaction.collection('auditLogs').add({
      data: { actor: OPENID, action: 'modifyAvailablePartners', target: goodID, partnerID, status, createdAt: db.serverDate() }
    })
    await transaction.commit()
    return { success: true, errMsg: '成功' }
  } catch (err) {
    await transaction.rollback()
    return { success: false, errMsg: err.message }
  }
}