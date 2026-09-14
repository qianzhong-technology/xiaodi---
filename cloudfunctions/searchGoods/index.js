// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const {playTime, price, name, id} = event

  const query = {isAvailable: true}  // 构建查询
  if (playTime && playTime.length === 2) {
    const [min, max] = playTime
    if (min !== undefined && max !== undefined) {
      query.playTime = { $gte: Number(min), $lte: Number(max) }
    }
  }
  if (price && price.length === 2) {
    const [min, max] = price
    if (min !== undefined && max !== undefined) {
      query.price = { $gte: Number(min), $lte: Number(max) }
    }
  }
  if (name) {
    query.name = db.RegExp({
      regexp: name,
      options: 'i'
    })
  }
  if (id) {
    const res = await db.collection('goods').doc(id).get()
    const resultGood = await cloud.callFunction({
      name: 'src_CloudToHttp',
      data: {
        goodDataOriginal: [res.data],
        status: 'goods'
      }
    })
    return {
      success: true,
      goodData: resultGood.result.goodData
    }
  }

  if (Object.keys(query).length === 0) {
    return { goodData: [] }
  }
  
  const res = await db.collection('goods').where(query).get()

  if(res.data.length === 0){
    return {
      success: false
    }
  }

  const resultGoods = await cloud.callFunction({
    name: 'src_CloudToHttp',
    data: {
      goodDataOriginal: res.data,
      status: 'goods'
    }
  })

  return {
    success: true,
    availableGoods: resultGoods.result.goodData
  }
}