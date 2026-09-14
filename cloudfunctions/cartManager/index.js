// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const action = event.action
  const goodID = event.goodID
  const goodIDs = event.goodIDs
  const amount = Number(event.amount)
  const provideUserID = event.userID

  if (!OPENID) {
    return { success: false, errMsg: '参数错误' }
  }

  // 1. 普通查询拿到 userID
  const userQuery = await db.collection('users').where({ openid: OPENID }).limit(1).get()
  if (userQuery.data.length === 0) {
    return { success: false, errMsg: '用户不存在' }
  }
  const userID = userQuery.data[0]._id

  // 防止非法请求
  if(userID != provideUserID){
    return { success: false, errMsg: 'userID错误' }
  }

  // 2. 开启事务
  const transaction = await db.startTransaction()

  try {
    // 3. 事务
    const freshUser = await transaction.collection('users').doc(userID).get()
    let cart = freshUser.data.cart

    // 4. 修改
    if (goodID) {
      const existing = cart.find(item => item._id === goodID)
      if (existing) {
        if (action == 'add') {
          existing.amount += amount
        } else if (action == 'delete') {
          existing.amount -= amount
        }
      } else {
        if (action == 'add') {
          cart.push({
            _id: goodID,
            amount
          })
        } else if (action == 'delete') {
          return {
            success: false,
            errMsg: '无此商品'
          }
        }
      }
    } else if (goodIDs) {
      if (action == 'delete') {
        if (!amount) {
          cart = cart.filter(item => !goodIDs.includes(item._id))
        }
      }
    }
    

    // 5. 写回
    await transaction.collection('users').doc(userID).update({
      data: {
        cart: cart
      }
    })

    await transaction.commit()
    return { success: true, errMsg: '成功' }

  } catch (err) {
    await transaction.rollback()
    console.error(err)
    return { success: false, errMsg: '失败' }
  }
}