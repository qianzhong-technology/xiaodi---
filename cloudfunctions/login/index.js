// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()

exports.main = async (event, context) => {
  const status = event.status;
  if (status === 'user') {
    const {
      phoneNumber,
      password
    } = event
    if (!phoneNumber || !password) {
      return {
        success: false,
        message: '用户名和密码不能为空'
      }
    }
    const res = await db.collection('users').where({
      phoneNumber: phoneNumber
    }).get()
  
    if (res.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
  
    const user = res.data[0]
    if (user.password !== password) {
      return {
        success: false,
        message: '密码错误'
      }
    }
  
    if(!user.isAvailable){
      return{
        success: false,
        message: '账号已封禁'
      }
    }

    const {
      password: pwd,
      ...safeUser
    } = user

    return {
      success: true,
      message: '登录成功',
      userInfo: safeUser
    }
  } else if (status === 'partner') {
    const {
      phone,
      password
    } = event
    if (!phone || !password) {
      return {
        success: false,
        message: '手机号和密码不能为空'
      }
    }
    const res = await db.collection('partners').where({
      phoneNumber: phone
    }).get()

    if (res.data.length === 0) {
      return {
        success: false,
        message: '用户不存在'
      }
    }
  
    const partner = res.data[0]
    if (partner.password !== password) {
      return {
        success: false,
        message: '密码错误'
      }
    }

    if(!partner.isAvailable){
      return{
        success: false,
        message: '账号已封禁'
      }
    }

    const {
      password: pwd,
      ...safePartner
    } = partner

    return {
      success: true,
      message: '登录成功',
      partnerInfo: safePartner
    }
  } else {
    return {
      success: false,
      message: '未知参数'
    }
  }
}