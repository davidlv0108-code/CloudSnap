# CloudSnap-Mobile

Minimal Expo mobile app scaffold for CloudSnap. 

运行：

```bash
cd CloudSnap-Mobile
npm install
npx expo start
```

移动端会自动解析后端地址，优先级如下：

- 使用 `Constants.manifest.extra.API_BASE`（如果通过 Expo 的 `extra` 注入）
- 如果在 Expo 开发模式下，自动使用调试器主机 IP（例如 `192.168.x.y`）并拼接为 `http://<host>:3000/api`
- Android 模拟器使用 `http://10.0.2.2:3000/api`
- iOS 模拟器或默认回退使用 `http://localhost:3000/api`

注意：若在真机上运行，请将主机机器的局域网 IP（例如 `192.168.0.10`）作为后端地址；可通过修改 `services/api.js` 中的 `API_BASE` 或在 Expo 的 `app.json`/`app.config.js` 的 `extra` 中传入 `API_BASE` 来覆盖。

本仓库内已添加 `app.json`（路径：CloudSnap-Mobile/app.json），你可以直接编辑 `expo.extra.API_BASE` 为你的开发机局域网地址（示例：`http://192.168.0.100:3000/api`）。

如何找到本机局域网 IP（Windows）：

1. 打开 PowerShell 或 CMD，运行：

```bash
ipconfig
```

2. 找到无线或有线网络适配器下的 IPv4 地址（例如 `192.168.0.100`），把 `app.json` 中的 `API_BASE` 改为 `http://<你的IP>:3000/api`。

编辑完后，在 `CloudSnap-Mobile` 目录重启 Expo：

```bash
npm install
npx expo start --clear
```