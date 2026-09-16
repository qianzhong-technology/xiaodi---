---
name: 🔴 安全漏洞 - 明文密码存储
about: 登录密码明文存储，数据库泄露将导致所有用户凭证失效
title: "[安全漏洞] 明文存储密码，数据库泄露将导致所有用户凭证失效"
labels: security, high-priority
---

## 🔴 [安全漏洞] 登录密码明文存储，数据库泄露将导致所有用户凭证失效

### 问题描述
登录云函数中直接在数据库中存储和比对明文密码，存在严重安全隐患。

### 漏洞位置
- 文件：`cloudfunctions/login/index.js`
- 第 31 行：`if (user.password !== password)`
- 第 78 行：`if (partner.password !== password)`

### 问题代码
```javascript
// ❌ 错误做法 - 明文密码
const user = res.data[0]
if (user.password !== password) {
  return {
    success: false,
    message: '密码错误'
  }
}
```

### 风险等级
**P0 - 高危** 

- 数据库一旦被黑，所有用户密码直接泄露
- 攻击者可直接登录任何账户
- 不符合 OWASP 安全标准

### 修复建议
1. **使用密码哈希算法**（如 bcrypt、Argon2）
   ```javascript
   const bcrypt = require('bcryptjs')
   const saltRounds = 10
   
   // 注册时加密
   const hashedPassword = await bcrypt.hash(password, saltRounds)
   
   // 登录时验证
   const isPasswordValid = await bcrypt.compare(password, user.password)
   if (!isPasswordValid) {
     return { success: false, message: '密码错误' }
   }
   ```

2. **立即重置所有用户密码**，通知用户更改

3. **添加密码强度验证**（最少 8 位，包含大小写和数字）

### 相关标准
- OWASP A02:2021 – Cryptographic Failures
- NIST SP 800-63B – Authentication and Lifecycle Management

### 待办
- [ ] 集成 bcrypt 库
- [ ] 更新密码存储逻辑
- [ ] 迁移历史密码数据
- [ ] 通知用户重置密码
- [ ] 添加密码强度验证
