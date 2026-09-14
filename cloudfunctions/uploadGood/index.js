// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const {name, price, playTime, desc, swiperImages, faceImage, hot} = event

  // 鉴权
  const adminRes = await db.collection('users').where({
    openid: wxContext.OPENID
  }).get()
  if (!adminRes.data[0] || !adminRes.data[0].isAdmin) {
    return {
      success: false,
      errMsg: '无权限操作'
    }
  }

  await db.collection('goods').add({
    data: {
      availablePartners: [],
      description: desc,
      hot: hot,
      imageSrc: faceImage,
      isAvailable: true,
      name: name,
      playTime: playTime,
      price: price,
      sales: 0,
      swiperImages: swiperImages
    }
  })
  return {
    success: true,
    openid: wxContext.OPENID
  }
}