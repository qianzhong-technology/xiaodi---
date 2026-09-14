const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 默认

exports.main = async (event, context) => {
  const status = event.status

  if (status === 'goods') {
    let goodDataOriginal = event.goodDataOriginal

    // 1. 支持传入单个对象或数组，统一转为数组处理
    const isSingle = !Array.isArray(goodDataOriginal)
    if (isSingle) {
      goodDataOriginal = [goodDataOriginal]
    }
  
    // 2. 空数组直接返回
    if (!goodDataOriginal.length) {
      return { goodData: isSingle ? null : [] }
    }
  
    // 3. 收集所有 cloud:// 开头
    const cloudIds = []
    goodDataOriginal.forEach(p => {
      // imageSrc 必选（你保证一定有）
      if (typeof p.imageSrc === 'string' && p.imageSrc.startsWith('cloud://')) {
        cloudIds.push(p.imageSrc)
      }
      // swiperImages 可选
      if (Array.isArray(p.swiperImages)) {
        p.swiperImages.forEach(img => {
          if (typeof img === 'string' && img.startsWith('cloud://')) {
            cloudIds.push(img)
          }
        })
      }
    })
  
    // 4. 没有需要转换的云文件
    if (cloudIds.length === 0) {
      return { goodData: isSingle ? goodDataOriginal[0] : goodDataOriginal }
    }
  
    // 5. 批量换临时链接
    const uniqueCloudIds = [...new Set(cloudIds)]
    const tempRes = await cloud.getTempFileURL({
      fileList: uniqueCloudIds
    })
  
    const urlMap = {}
    tempRes.fileList.forEach(item => {
      if (item.status === 0) urlMap[item.fileID] = item.tempFileURL
    })
  
    // 6. 映射替换
    const result = goodDataOriginal.map(p => {
      const newItem = { ...p }
  
      // 转换 imageSrc
      if (newItem.imageSrc && urlMap[newItem.imageSrc]) {
        newItem.imageSrc = urlMap[newItem.imageSrc]
      }
  
      // 转换 swiperImages（仅当存在且是数组时）
      if (Array.isArray(newItem.swiperImages)) {
        newItem.swiperImages = newItem.swiperImages.map(img =>
          urlMap[img] || img
        )
      }
  
      return newItem
    })
  
    // 7. 如果传入的是单个对象，返回单个对象;是数组就返回数组
    return {
      success: true,
      goodData: isSingle ? result[0] : result
    }
  } else if (status === 'partners') {
    let partnersDataOriginal = event.partnersDataOriginal

    // 获取临时头像链接
    const cloudIds = []
    partnersDataOriginal.forEach(p => {
      if (typeof p.imageSrc === 'string' && p.imageSrc.startsWith('cloud://')) {
        cloudIds.push(p.imageSrc)
      }
    })

    const uniqueCloudIds = [...new Set(cloudIds)]
    const tempRes = await cloud.getTempFileURL({
      fileList: uniqueCloudIds
    })

    const urlMap = {}
    tempRes.fileList.forEach(item => {
      if (item.status === 0) urlMap[item.fileID] = item.tempFileURL
    })

    const partnersData = partnersDataOriginal.map(p => {
      const newItem = {
        ...p
      }

      // 转换 imageSrc
      if (newItem.imageSrc && urlMap[newItem.imageSrc]) {
        newItem.imageSrc = urlMap[newItem.imageSrc]
      }

      return newItem;
    })
    return {
      success: true,
      partnersData: partnersData
    }
  } else {
    return {
      success: false
    }
  }
}