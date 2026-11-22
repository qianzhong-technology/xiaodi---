// 消费及销量在订单确认事务中更新，不接受客户端直接记账。
exports.main = async () => {
  return { success: false, errMsg: '请通过订单确认更新消费' }
}
