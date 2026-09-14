// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { status, goodID, partnerID } = event

  // 1. 获取商品文档
  const goodRef = db.collection('goods').doc(goodID)
  const goodDoc = await goodRef.get()
  const good = goodDoc.data

  if (!good) {
    return { success: false, errMsg: '无此商品' }
  }

  const partners = good.availablePartners

  switch (status) {
    case 'add':
      if (partners.includes(partnerID)) {
        return { success: false, errMsg: '已添加,请勿重复添加' }
      }
      partners.push(partnerID)
      await goodRef.update({ data: { availablePartners: partners } })
      return { success: true, errMsg: '成功' }

    case 'delete':
      if (!partners.includes(partnerID)) {
        return { success: false, errMsg: '无此陪玩,请查证陪玩ID' }
      }
      const newPartners = partners.filter(item => item !== partnerID)
      await goodRef.update({ data: { availablePartners: newPartners } })
      return { success: true, errMsg: '成功' }

    default:
      return { success: false, errMsg: '未知参数' }
  }
}