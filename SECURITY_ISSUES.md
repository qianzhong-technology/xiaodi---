# 代码安全分析报告

本文档记录了对 xiaodi--- 小程序代码进行的安全分析发现的问题。

## 🔴 高危问题

### 1. 明文密码存储 (P0)
- 文件: `cloudfunctions/login/index.js`
- 描述: 密码直接明文存储在数据库，未使用任何加密/哈希
- 影响: 数据库泄露导致所有用户凭证失效

### 2. 支付金额未服务端验证 (P1)
- 文件: `cloudfunctions/getPrePayment/index.js`
- 描述: 金额直接来自客户端，未与数据库订单验证
- 影响: 攻击者可篡改支付金额

### 3. 缺少访问控制 (P1)
- 文件: 多个云函数
- 描述: changeOrderState, toggleBanUser 等无权限检查
- 影响: 任何用户可操作他人数据

### 4. 支付回调 JSON 解析无保护 (P1)
- 文件: `cloudfunctions/paymentCallBack/index.js` 第 82 行
- 描述: JSON.parse(parsed.attach) 无 try-catch
- 影响: 格式错误导致云函数崩溃

### 5. 硬编码客户端 IP (P1)
- 文件: `cloudfunctions/getPrePayment/index.js` 第 68 行
- 描述: IP 地址硬编码为 127.0.0.1
- 影响: 微信支付风控系统误判

### 6. Cloud Env 配置为空 (P1)
- 文件: `app.js` 第 5 行
- 描述: env: "" 为空字符串
- 影响: 云开发环境无法初始化

### 7. 支付幂等性缺陷 (P1)
- 文件: `cloudfunctions/paymentCallBack/index.js`
- 描述: 无防重机制，重复回调重复更新
- 影响: 订单可能多次确认

### 8. 账户状态检查不一致 (P2)
- 文件: 多个云函数
- 描述: login 检查 isAvailable，但其他函数不检查
- 影响: 被封禁账户仍可操作数据

## 详细分析见 GitHub Issues
