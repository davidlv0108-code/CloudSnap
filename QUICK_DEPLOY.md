# ⚡ CloudSnap 部署 - 快速参考卡

## 🎯 您的目标
在网上部署应用，获得可测试的网址

## ⏱️ 预计时间
**20 分钟**

---

## 📋 三步部署

### 1️⃣ 推送到 GitHub（2 分钟）
```bash
cd CloudSnap
git add . && git commit -m "Deploy" && git push origin main
```

### 2️⃣ 部署前端到 Vercel（5 分钟）

1. https://vercel.com
2. Sign Up with GitHub
3. Add New Project
4. Import CloudSnap 仓库
5. Root Directory: `CloudSnap-Frontend`
6. Deploy

✅ **获得：** `https://cloudsnap-xxx.vercel.app`

### 3️⃣ 部署后端到 Railway（8 分钟）

1. https://railway.app
2. Start a New Project
3. Deploy from GitHub repo
4. 授权 GitHub
5. 选择 CloudSnap 仓库
6. Deploy

✅ **获得：** `https://cloudsnap-backend-xxx.railway.app`

### 4️⃣ 连接前后端（5 分钟）

编辑 `CloudSnap-Frontend/.env`：
```
REACT_APP_API_URL=https://cloudsnap-backend-xxx.railway.app/api
```

推送：
```bash
git add . && git commit -m "API config" && git push origin main
```

✅ **完成！**

---

## 🌐 您获得的链接

```
前端：https://cloudsnap-xxx.vercel.app
后端：https://cloudsnap-backend-xxx.railway.app/health
```

---

## 📱 用户可以：

✅ 打开网站  
✅ 注册/登录  
✅ 使用相机  
✅ 拍照上传  
✅ 浏览相册  
✅ **在手机桌面安装应用**

---

## 💰 成本
**免费！**

---

## 🚀 现在就开始！

按照上面 4 步操作，20 分钟内完成部署。

详见 `DEPLOY_NOW.md`

