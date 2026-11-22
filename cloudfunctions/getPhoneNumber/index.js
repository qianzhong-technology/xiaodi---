// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event) => {
  const { code } = event
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) return { success: false, errMsg: '未认证用户' }

  const res = await cloud.openapi.phonenumber.getPhoneNumber({
    code: code,
    openid: OPENID
  })
  
  return res
}