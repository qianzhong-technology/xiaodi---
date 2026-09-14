// 云函数入口文件
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const status = event.status;

  if (status === 'user') {
    const e = await db.collection('users').where({
      openid: wxContext.OPENID
    }).get()

    if (e.data.length > 0) {
      const name = e.data[0].username
      return {
        success: false,
        errMsg: `已注册${name},无法创建多个账号`
      }
    }

    const {
      username,
      password,
      phoneNumber
    } = event;

    const res = await db.collection('users').where({
      phoneNumber: phoneNumber
    }).get()
    if (res.data.length > 0) {
      return {
        success: false,
        errMsg: '该手机号已注册'
      }
    }

    await db.collection('users').add({
      data: {
        cart: [],
        consumption: 0,
        isAdmin: false,
        isAvailable: true,
        openid: wxContext.OPENID,
        password: password,
        phoneNumber: phoneNumber,
        username: username
      }
    })
    return {
      success: true,
      openid: wxContext.OPENID
    }
  } else if (status === 'partner') {
    const e = await db.collection('partners').where({
      openid: wxContext.OPENID
    }).get()

    if (e.data.length > 0) {
      const name = e.data[0].nickname
      return {
        success: false,
        errMsg: `已注册${name},无法创建多个账号`
      }
    }

    const {
      avatarUrl,
      phone,
      password,
      nickname,
      gender,
      bio,
      games,
      tags
    } = event

    const res = await db.collection('partners').where({
      phone: phone
    }).get()
    if (res.data.length > 0) {
      return {
        success: false,
        errMsg: '该手机号已注册'
      }
    }

    await db.collection('partners').add({
      data: {
        bio: bio,
        games: games,
        gender: gender,
        imageSrc: avatarUrl,
        isAvailable: true,
        isOnline: false,
        nickname: nickname,
        openid: wxContext.OPENID,
        password: password,
        phoneNumber: phone,
        tags: tags
      }
    })
    return {
      success: true,
      openid: wxContext.OPENID
    }
  } else {
    return {
      success: false,
      errMsg: '未知参数'
    }
  }
}