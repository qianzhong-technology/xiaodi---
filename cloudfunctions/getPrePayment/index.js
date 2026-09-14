// 云函数入口文件
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const axios = require('axios')
const xml2js = require('xml2js')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const APPID = process.env.WX_APPID
const MCHID = process.env.MCH_ID
const APIKEY = process.env.WX_API_KEY
const NOTIFY = process.env.WX_NOTIFY_URL

// 按字典序拼接签名（v2 MD5）
function sign(params) {
  const arr = Object.keys(params)
    .filter(k => params[k] !== '' && params[k] !== undefined && k !== 'sign')
    .sort()
  const str = arr.map(k => `${k}=${params[k]}`).join('&') + '&key=' + APIKEY
  return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase()
}

// 对象转XML，值包CDATA
function toXml(obj) {
  let xml = '<xml>'
  for (const k in obj) {
    xml += `<${k}><![CDATA[${obj[k]}]]></${k}>`
  }
  return xml + '</xml>'
}

// 解析微信返回；xml2js 默认数组，统一取val[0]或val
async function parseXml(str) {
  const p = await xml2js.parseStringPromise(str, { explicitArray: false, ignoreAttrs: true })
  const x = (p && p.xml) || {}
  const out = {}
  for (const k in x) {
    let v = x[k]
    if (Array.isArray(v)) v = v[0]
    if (typeof v === 'object') v = JSON.stringify(v) // 极端兜底
    out[k] = v
  }
  return out
}

exports.main = async (event) => {
  const ctx = cloud.getWXContext()
  const { totalPrice, orderIDs, body = 'xiaodi电竞-陪玩' } = event
  const outTradeNo = 'XD' + Date.now() + Math.floor(Math.random() * 1000)

  if (!ctx.OPENID) return { error: 'openid为空, 必须由小程序直接callFunction' }
  const totalFee = Math.round(Number(totalPrice) * 100)
  if (!totalFee || totalFee <= 0) return { error: '金额无效' }

  let attachStr = ''
  if (orderIDs) {
    attachStr = typeof orderIDs === 'string' ? orderIDs : JSON.stringify(orderIDs)
  }

  const nonce = crypto.randomBytes(16).toString('hex')
  const req = {
    appid: APPID,
    mch_id: MCHID,
    nonce_str: nonce,
    body,
    out_trade_no: outTradeNo,
    total_fee: totalFee,
    spbill_create_ip: '127.0.0.1',
    notify_url: NOTIFY,
    trade_type: 'JSAPI',
    openid: ctx.OPENID,
    attach: attachStr
  }
  req.sign = sign(req)

  try {
    const { data } = await axios.post(
      'https://api.mch.weixin.qq.com/pay/unifiedorder',
      toXml(req),
      { headers: { 'Content-Type': 'text/xml' }, responseType: 'text', timeout: 8000 }
    )

    //console.log('微信原始返回:', data)
    const r = await parseXml(data)
    //console.log('解析后:', JSON.stringify(r))

    if (r.return_code !== 'SUCCESS') return { error: '通信失败:' + r.return_msg, debug: r }
    if (r.result_code !== 'SUCCESS') return { error: '业务失败:' + (r.err_code_des || r.return_msg), debug: r }

    const prepayId = r.prepay_id
    if (!prepayId) return { error: '没有prepay_id', debug: r }

    const timeStamp = String(Math.floor(Date.now() / 1000))
    const nonceStr = crypto.randomBytes(16).toString('hex')
    const pkg = 'prepay_id=' + prepayId

    // 小程序调起二次签名（MD5）
    const paySignParams = {
      appId: APPID,
      timeStamp,
      nonceStr,
      package: pkg,
      signType: 'MD5'
    }
    const paySign = sign(paySignParams)
    
    return {
      appId: APPID,
      timeStamp,
      nonceStr,
      package: pkg,
      signType: 'MD5',
      paySign,
      outTradeNo: outTradeNo
    }
  } catch (e) {
    console.error('unifiedorder异常', e)
    return { error: '请求微信支付异常', detail: e.message }
  }
}