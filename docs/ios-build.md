# 打包成 iOS App（本地 Xcode + 免费 Apple ID）

自己用、不花钱的最简路径。App 名称是「雅思私教」。

## 前提
- 一台 Mac，装了 **Xcode**（App Store 下载，首次打开让它装好命令行组件）
- 一个 **Apple ID**（免费即可，不需要 $99/年 开发者账号）
- iPhone + 数据线

## 步骤

### 1. 让 App 指向你的服务器
原生 App 不能像网页那样从当前地址自动推导 API（网页版才可以）。在 `apps/mobile/` 下建 `.env.local`（已 gitignore）：

```
EXPO_PUBLIC_API_URL=http://<你的服务器公网IP>:8787
```

以后有域名/HTTPS 就换成 `https://你的域名`。要保证手机能访问到这个地址（公网 IP + 安全组放行 8787，或和手机同一局域网）。

### 2. 生成原生工程并装到 iPhone

```bash
cd apps/mobile
npx expo run:ios --device
```

第一次会自动 `prebuild`（生成 `ios/` 原生工程）、`pod install`、编译，然后装到你选的 iPhone。

如果报**签名错误**，用 Xcode 打开工程手动设置一次签名：

```bash
open ios/*.xcworkspace
```

在 **Signing & Capabilities** 里：
- 勾选 **Automatically manage signing**
- **Team** 选你的个人 Apple ID（没有就点 Add an Account 登录免费 ID）
- 若 bundle id 冲突，改成唯一的（如 `com.你的名字.ieltstutor`；当前是 `com.hellojackhui.ieltstutor`）

然后顶部选中你的 iPhone，点 ▶ 运行。

### 3. 在 iPhone 上信任开发者
首次打开会提示"不受信任的开发者"：**设置 → 通用 → VPN 与设备管理 → 点你的 Apple ID → 信任**。

### 4. 免费 Apple ID 的限制
- 证书 **7 天过期**，过期后重跑 `npx expo run:ios --device` 重装即可
- 同时能装的自签 App 数量有限
- 想免除这些限制（真机长期用 / TestFlight / 上架），再上 $99/年 开发者账号，那时可切到 EAS 云构建

## 只想先在模拟器上看
```bash
cd apps/mobile
npx expo run:ios     # 不加 --device
```
模拟器跑在 Mac 上，`EXPO_PUBLIC_API_URL` 用 Mac 能访问到的服务器地址即可。

## 备注
- `ios/` 目录是本地生成的，已 gitignore，不进仓库；换机器重新 `expo run:ios` 会再生成。
- 改了 `.env.local` 里的 API 地址后要重新 `run:ios` 才会生效（这个值是打包时写死进去的）。
