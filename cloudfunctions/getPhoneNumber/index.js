// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event) => {
  const { code } = event
  const { OPENID } = cloud.getWXContext()

  const res = await cloud.openapi.phonenumber.getPhoneNumber({
    code: code,
    openid: OPENID
  })
  
  return res
}