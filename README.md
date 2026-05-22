# 优涂工品小程序商城

## 项目简介

优涂工品小程序商城是基于 Vendure 3.6.3 的工业耗材B2B批量采购微信小程序，参考荣欣超市UI设计，主打效率优先、工业风、批量采购优先。

## 技术栈

- **前端框架**：微信小程序原生开发
- **UI 组件**：Vant Weapp
- **后端服务**：Vendure 3.6.3 GraphQL API
- **状态管理**：本地存储 + 全局数据

## 项目结构

```
youcai-miniapp/
├── app.js              # 应用入口
├── app.json            # 应用配置
├── app.wxss            # 全局样式
├── config.js           # 配置文件
├── package.json        # 依赖配置
├── project.config.json # 项目配置
├── sitemap.json       # SEO配置
├── utils/             # 工具函数
│   ├── api.js         # GraphQL客户端
│   ├── auth.js        # 认证工具
│   ├── request.js     # HTTP请求
│   └── util.js        # 通用工具
├── providers/         # 数据层
│   └── shop/
│       ├── products/  # 商品接口
│       ├── orders/    # 订单接口
│       └── customer/  # 客户接口
├── pages/             # 页面
│   ├── home/          # 首页
│   ├── category/      # 分类页
│   ├── cart/          # 采购车
│   ├── mine/          # 个人中心
│   ├── product/       # 商品详情
│   ├── search/        # 搜索页
│   ├── orders/        # 订单列表
│   ├── orderDetail/   # 订单详情
│   ├── address/       # 地址管理
│   ├── checkout/      # 结算页
│   └── login/         # 登录页
└── static/            # 静态资源
    ├── icons/         # 图标
    ├── images/        # 图片
    └── tabbar/        # 底部导航图标
```

## 功能特性

### ✅ 已完成功能

1. **首页**
   - 搜索框（搜索型号/品牌/编码）
   - Banner轮播
   - 8个快捷入口
   - 活动专区（限时抢购、批量价、今日特价）
   - 为你推荐商品

2. **分类页**
   - 左侧一级分类导航
   - 右侧商品列表
   - 筛选功能（品牌/价格/库存/起订量）
   - 商品展示（型号/品牌/批量价/库存）

3. **商品详情**
   - 图片轮播
   - 价格展示（零售价/批量价/企业价）
   - 工业参数（型号/品牌/物料编码/材质/规格）
   - 起订量和交期
   - 加入采购车

4. **采购车**
   - 商品列表展示
   - 数量调整
   - 全选/单选
   - 删除商品
   - 合计计算
   - 结算功能

5. **个人中心**
   - 企业信息展示
   - 订单管理（待审批/待付款/待发货/已完成）
   - 收货地址管理
   - 发票管理
   - 采购审批
   - 对账管理
   - 联系客服

6. **订单管理**
   - 订单状态筛选
   - 订单列表
   - 订单详情
   - 订单操作（提醒发货、再次购买）

7. **地址管理**
   - 地址列表
   - 添加地址
   - 编辑地址
   - 删除地址
   - 设置默认地址

8. **结算页**
   - 地址选择
   - 商品确认
   - 价格明细
   - 支付方式（微信/支付宝/对公转账）
   - 订单备注
   - 提交订单

9. **登录**
   - 手机号+验证码登录
   - 微信一键登录
   - 用户协议

## 设计规范

### 配色方案

- **主色**：工业蓝 `#165DFF`
- **辅助色**：
  - 橙色 `#FF7D00`
  - 绿色 `#00B42A`
  - 灰色 `#86909C`
- **警示色**：红色 `#FF4D4F`

### 字体规范

- **标题**：18-24px 粗体
- **正文**：14-16px
- **辅助信息**：12px 浅灰色
- **行高**：1.4-1.5

### 卡片规范

- 圆角：8px
- 间距：12px
- 阴影：`0 2px 8px rgba(0,0,0,0.08)`
- 边框：1px 浅灰

### 布局规范

- 左右边距：16px
- 元素间距：8px倍数
- 按钮高度：≥44px（触摸友好）

## API集成

### Vendure GraphQL

项目使用 GraphQL 与 Vendure 后端通信，主要接口包括：

```javascript
// 商品查询
const { getProducts, getProduct, searchProducts } = require('./providers/shop/products/products');

// 订单管理
const { getActiveOrder, addItemToOrder, getCustomerOrders } = require('./providers/shop/orders/order');

// 客户管理
const { getActiveCustomer, getCustomerAddresses } = require('./providers/shop/customer/customer');
```

### 环境配置

在 `config.js` 中配置：

```javascript
development: {
  API_URL: 'http://192.168.0.51:3000/shop-api',
  GRAPHQL_URL: 'http://192.168.0.51:3000',
},
production: {
  API_URL: 'https://shop.youcai-tool.com/shop-api',
  GRAPHQL_URL: 'https://shop.youcai-tool.com',
},
CHANNEL_TOKEN: 'your-channel-token',
```

## 快速开始

### 1. 安装依赖

```bash
# 在微信开发者工具中打开项目
# 使用 npm install 安装依赖（如需要）
npm install
```

### 2. 配置环境

编辑 `config.js` 配置正确的 API 地址和 Channel Token。

### 3. 启动开发

在微信开发者工具中导入项目，选择项目目录，即可开始开发。

## 开发规范

### 页面结构

每个页面包含4个文件：

- `page.json` - 页面配置
- `page.wxml` - 页面结构
- `page.js` - 页面逻辑
- `page.wxss` - 页面样式

### 命名规范

- 组件命名：小写+下划线（如 `goods_card`）
- 样式类名：采用 BEM 命名规范
- 页面路径：小写字母（如 `pages/home/home`）

### 代码风格

- 使用 ES6+ 语法
- async/await 处理异步
- 模块化组织代码
- 统一的错误处理

## 待完善功能

- [ ] 微信支付集成
- [ ] 支付宝支付集成
- [ ] 消息推送
- [ ] 客服系统
- [ ] 订单审批流
- [ ] 发票申请
- [ ] 对账功能
- [ ] 数据统计

## 注意事项

1. **API配置**：确保 `config.js` 中的 API 地址正确
2. **Channel Token**：需要与 Vendure 后端配置的 Channel Token 一致
3. **小程序权限**：需要在小程序后台配置合法域名
4. **图片资源**：生产环境需要使用 CDN 或对象存储

## 联系方式

- 客服电话：400-888-8888
- 工作时间：9:00-18:00
- 微信公众号：优涂工品

## License

MIT License
