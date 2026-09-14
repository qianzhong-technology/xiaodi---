// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 并行查询，提高效率
    const [maxPriceRes, minPriceRes, maxPlayTimeRes, minPlayTimeRes] = await Promise.all([
      db.collection('goods')
        .where({ isAvailable: true })
        .orderBy('price', 'desc')
        .limit(1)
        .get(),
      
      db.collection('goods')
        .where({ isAvailable: true })
        .orderBy('price', 'asc')
        .limit(1)
        .get(),
      
      db.collection('goods')
        .where({ isAvailable: true })
        .orderBy('playTime', 'desc')
        .limit(1)
        .get(),
      
      db.collection('goods')
        .where({ isAvailable: true })
        .orderBy('playTime', 'asc')
        .limit(1)
        .get()
    ])

    const getFirstValue = (res, field) => {
      if (res.data && res.data.length > 0) {
        return res.data[0][field]
      }
      return null
    }

    return {
      minPrice: getFirstValue(minPriceRes, 'price'),
      maxPrice: getFirstValue(maxPriceRes, 'price'),
      minPlayTime: getFirstValue(minPlayTimeRes, 'playTime'),
      maxPlayTime: getFirstValue(maxPlayTimeRes, 'playTime')
    }
    
  } catch (err) {
    console.error('云函数执行失败:', err)
    return {
      error: true,
      message: err.message,
      minPrice: null,
      maxPrice: null,
      minPlayTime: null,
      maxPlayTime: null
    }
  }
}