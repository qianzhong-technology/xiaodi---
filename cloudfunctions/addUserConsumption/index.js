const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { openid, goodID, totalAmount } = event

  try {
    // 1. 更新用户消费
    const userQuery = db.collection('users').where({ openid })
    const userSnapshot = await userQuery.get()
    const userData = userSnapshot.data[0]

    if (!userData) {
      return { success: false, errMsg: '用户不存在' }
    }

    await userQuery.update({
      data: {
        consumption: _.inc(Number(totalAmount) || 0)
      }
    })

    // 2. 更新商品销量 +1
    if (goodID) {
      const goodRef = db.collection('goods').doc(goodID)
      const goodSnapshot = await goodRef.get()
      if (!goodSnapshot.data) {
        return { success: false, errMsg: '商品不存在' }
      }
      await goodRef.update({
        data: {
          sales: _.inc(1)
        }
      })
    }

    return { success: true }
  } catch (err) {
    console.error('更新失败:', err)
    return { success: false, errMsg: err.message }
  }
}