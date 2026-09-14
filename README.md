<p align="center">
  <img src="images/logo.png" width="144"/>
</p>

<h1 align="center">xiaodi电竞-小程序源码</h1>

## 特性
- 普通直连 v2 统一下单 / 回调 base64 解码 / MD5 验签
- 小程序直连微信支付：自研可扩展prepay预定单生成及算法
- 云开发云函数模板，双签名自动算
- 虚拟支付支持 iOS/安卓/沙箱全终端

## 目录
- [项目简介](#项目名称)
- [快速开始](#快速开始)
- [待开发](#待开发)

# [项目名称]

> 微信小程序支付一站式解决方案：普通直连商户 v2 支付 + 小程序虚拟支付（道具/代币），基于云开发云函数，零服务器维护。

![WeChat Pay](https://img.shields.io/badge/wechat-pay%20v2-07C160)
![Virtual Pay](https://img.shields.io/badge/virtual--pay-xpay-1677FF)
![Cloud Functions](https://img.shields.io/badge/runtime-cloud%20functions-blue)

## 项目简介

本项目为微信小程序提供**完整的前后端支付能力**，涵盖两种支付模式：

- **普通微信支付 v2**：自封装统一下单、回调验签、退款等 API，不使用云开发内置支付接口，完全自主可控。
- **小程序虚拟支付（xpay）**：支持道具直购（`short_series_goods`）和代币充值（`short_series_coin`），包含服务端双签名（paySig + signature）及订单回调发货。

所有逻辑均运行于**云开发云函数**中，无需购买服务器，天然支持弹性伸缩。前端通过 `wx.cloud.callFunction` 调用，后端自动处理签名、订单状态、幂等发货。

### 特性

- ✅ 普通直连商户 v2 支付（XML + MD5 签名）
- ✅ 虚拟支付道具直购 & 代币充值
- ✅ 云函数双签名（paySig / signature）自动计算
- ✅ 回调通知处理（notify_url + 云开发消息推送）
- ✅ 订单状态机（pending → paid → delivered）
- ✅ 沙箱环境隔离（现网/沙箱 AppKey 一键切换）
- ✅ 手机号获取（云调用版，无需维护 access_token）

---

## 快速开始

### 前置条件

1. 已完成微信小程序注册并认证（个人/企业均可）
2. 已开通**微信支付**（普通直连商户）
3. 已开通**小程序虚拟支付**（MP 后台 → 虚拟支付，获取 AppKey）
4. 已创建云开发环境（免费版即可）

### 安装

将本仓库克隆到本地，然后在云开发环境中部署云函数


## 待开发
- 虚拟支付：道具直购，代币充值，代币消费，道具上传等
- 更多活动
