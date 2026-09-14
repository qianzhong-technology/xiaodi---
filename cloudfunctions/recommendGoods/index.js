// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const quantity = event.quantity;
  const result = await db.collection('goods')
    .where({ isAvailable: true })
    .orderBy('hot', 'desc')
    .limit(quantity)
    .get();
  
  const resultGoods = await cloud.callFunction({
    name: 'src_CloudToHttp',
    data: {
      goodDataOriginal: result.data,
      status: 'goods'
    }
  })
      
  return {
    goodData: resultGoods.result.goodData
  }
}