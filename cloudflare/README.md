# 独立 Cloudflare 免费部署

本目录可独立部署，不依赖 ChatGPT Sites 或其登录系统。网址由你自己的 Cloudflare 账号分配为 workers.dev；实际地址以部署返回为准。

## 首次部署

```sh
cd cloudflare
npm install
npx wrangler login
npx wrangler d1 create jiayu-demo
```

将创建结果中的 database_id 填入 `wrangler.example.jsonc` 的副本 `wrangler.jsonc`，不要改动 DB 绑定名称。

```sh
npm run db:remote
npx wrangler secret put SESSION_SECRET
npx wrangler secret put MERCHANT_CODE
npx wrangler secret put ARK_API_KEY
npm run deploy
```

SESSION_SECRET 使用独立随机长字符串，MERCHANT_CODE 使用新的商家管理码。API Key 仅在交互提示中输入。不要提交这些值到 GitHub。可先不配置 ARK_API_KEY 测试非AI功能，页面会明确提示未配置。

数据库为新实例：不会自动复制旧站预约、顾客资料或上传图片。切换完成前保留旧站。AI 解析和试戴需在新环境重新验证；更换域名不保证能解决模型接口的超时。

## 后续更新

提交源码后，在此目录运行 `npm run deploy` 即可发布新版本；当前尚未连接 GitHub 自动部署。Cloudflare 免费额度有请求、CPU与数据库限制，AI 上游仍可能计费。
