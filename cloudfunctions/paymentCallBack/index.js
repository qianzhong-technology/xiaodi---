// 云函数入口文件
const cloud = require('wx-server-sdk')
const crypto = require('crypto')
const xml2js = require('xml2js')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const APIKEY = process.env.WX_API_KEY

function isLikelyBase64(s){
  if (!s || s.trim().startsWith('<')) return false
  const t = s.trim()
  
  return /^[A-Za-z0-9+/=\r\n]+$/.test(t) && t.replace(/[\r\n=]/g,'').length >= 16
}

async function getXmlFromEvent(event){
  let raw = event.body
  if (raw == null) throw new Error('empty body')
  if (typeof raw !== 'string') raw = JSON.stringify(raw)
  raw = raw.trim()
  if (isLikelyBase64(raw)) {
    try { raw = Buffer.from(raw, 'base64').toString('utf8').trim() }
    catch(e){ console.error('base64解码失败', e) }
  }

  if (!raw.includes('<xml')) {
    const m = raw.match(/<xml>[\s\S]*?<\/xml>/i)
    if (m) raw = m[0]
  }
  return raw
}

function parseXml(str){
  return xml2js.parseStringPromise(str, { explicitArray:false, ignoreAttrs:true })
    .then(r => r.xml || {})
}

function flat(o){
  const out = {}
  for (const k in o){
    let v = o[k]
    if (Array.isArray(v)) v = v[0]
    if (v && typeof v === 'object') v = JSON.stringify(v)
    out[k] = v
  }
  return out
}

function md5Sign(obj){
  const keys = Object.keys(obj).filter(k=>k!=='sign' && obj[k]!=='' && obj[k]!==undefined && obj[k]!==null)
    .sort()
  const str = keys.map(k=>`${k}=${obj[k]}`).join('&') + '&key=' + APIKEY
  return crypto.createHash('md5').update(str,'utf8').digest('hex').toUpperCase()
}

function okXml(){ return '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>' }
function failXml(msg){ return `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[${msg||'error'}]]></return_msg></xml>` }

exports.main = async (event) => {
  let xml
  try { xml = await getXmlFromEvent(event) }
  catch(e){ console.error('取body失败', e); return failXml('empty') }

  let parsed
  try { parsed = flat(await parseXml(xml)) }
  catch(e){
    console.error('解析XML失败', e, 'raw:', xml?.substring?.(0,300))
    return failXml('parse')
  }

  if (parsed.return_code !== 'SUCCESS') return okXml() // 通信失败也回SUCCESS避免无意义重推
  const mySign = md5Sign(parsed)
  if (mySign !== parsed.sign){
    console.error('签名不符', 'local=',mySign,'wx=',parsed.sign)
    return failXml('sign')
  }
  if (parsed.result_code !== 'SUCCESS') return okXml()

  const outTradeNo = parsed.out_trade_no
  const transactionId = parsed.transaction_id
  const totalFee = parseInt(parsed.total_fee,10)
  const orderIds = JSON.parse(parsed.attach)
  console.log(outTradeNo, transactionId, totalFee, orderIds)

  try {
    for (const oid of orderIds){
      await db.collection('orders').doc(oid).update({
        data: {
          isPay: true,
          payTime: db.serverDate(),
          transactionId: transactionId,
          status: 'pending'
        }
      })
    }
  } catch(e){
    console.error('改单失败', e)
  }

  return okXml()
}