const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { orderID, status } = event
  if (!OPENID) return { success: false, errMsg: '未认证用户' }
  if (typeof orderID !== 'string' || !orderID || typeof status !== 'string') {
    return { success: false, errMsg: '参数错误' }
  }

  const users = await db.collection('users').where({ openid: OPENID }).limit(1).get()
  const partners = await db.collection('partners').where({ openid: OPENID }).limit(1).get()
  const transaction = await db.startTransaction()
  try {
    const orderRef = transaction.collection('orders').doc(orderID)
    const order = (await orderRef.get()).data
    if (!order) throw new Error('订单不存在')

    const user = users.data[0] && (await transaction.collection('users').doc(users.data[0]._id).get()).data
    const partner = partners.data[0] && (await transaction.collection('partners').doc(partners.data[0]._id).get()).data
    const admin = user && user.openid === OPENID && user.isAvailable === true && user.isAdmin === true
    const owner = user && user.openid === OPENID && user.isAvailable === true && order._openid === OPENID
    const assigned = partner && partner.openid === OPENID && partner.isAvailable === true &&
      order.partner && order.partner._id === partner._id
    const transitions = {
      unpaid: ['cancelled'],
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: []
    }
    if (!transitions[order.status] || !transitions[order.status].includes(status)) {
      throw new Error('无效的订单状态转换')
    }
    if (!admin && !(owner && order.status === 'unpaid' && status === 'cancelled') &&
        !(assigned && ((order.status === 'pending' && status === 'confirmed') ||
                       (order.status === 'confirmed' && status === 'completed')))) {
      throw new Error('无权限操作')
    }
    if (status === 'confirmed') {
      if (order.isPay !== true) throw new Error('订单未支付')
      const customerQuery = await db.collection('users').where({ openid: order._openid }).limit(1).get()
      if (!customerQuery.data[0]) throw new Error('用户不存在')
      const customerRef = transaction.collection('users').doc(customerQuery.data[0]._id)
      const customer = (await customerRef.get()).data
      const goodRef = transaction.collection('goods').doc(order.goodID)
      const good = (await goodRef.get()).data
      const amount = Number(order.amount)
      const price = good && Number(good.price)
      if (!customer || customer.openid !== order._openid || !good ||
          !Number.isSafeInteger(amount) || amount <= 0 ||
          !Number.isFinite(price) || price < 0 || !Number.isFinite(amount * price)) {
        throw new Error('订单数据无效')
      }
      await customerRef.update({ data: { consumption: db.command.inc(amount * price) } })
      await goodRef.update({ data: { sales: db.command.inc(1) } })
    }

    await orderRef.update({ data: { isConfirm: status !== 'pending' && status !== 'unpaid', status } })
    await transaction.collection('auditLogs').add({
      data: { actor: OPENID, action: 'changeOrderState', target: orderID, from: order.status, to: status, createdAt: db.serverDate() }
    })
    await transaction.commit()
    return { success: true }
  } catch (err) {
    await transaction.rollback()
    return { success: false, errMsg: err.message }
  }
}
