# 学迹 · 手机本地版

沿用学迹现有界面，使用 Capacitor 打包为 Android / iOS App。首次打开是一份空档案，无需账号、服务器或 Docker。考试、个人资料与成绩截图保存在应用私有目录，所有操作可离线完成。不同手机之间不会自动同步。

## 安装与数据保护

- Android：安装经过签名的 APK。更新时使用同一签名的新版覆盖安装；不要先卸载旧版。
- iPhone：项目提供 iOS 工程。必须使用 Apple 签名后才能安装；**无签名 IPA 不能直接安装**。目前未提供 App Store / TestFlight 发行，也未取得相应签名。
- 在「档案工具」中导出完整 ZIP 备份，通过系统分享面板保存到自己选择的位置。该备份包含资料、成绩和截图，应自行妥善保管。
- 换机后安装 App，在「档案工具」选择 ZIP，预览并输入确认文字后恢复。恢复会替换当前手机内的档案；请先导出当前档案。
- 卸载、清除应用数据、设备损坏可能造成记录丢失。请定期手动备份。导出 CSV 只包含表格，不代替完整 ZIP 备份。
- Android 已关闭应用云备份与设备迁移备份；iOS 的档案目录标记为不参与系统备份。导出文件的位置由用户自行选择。
- 本地 App 不使用网页端的密码系统，不提供独立登录。访问保护依靠手机锁屏与系统应用隔离。

## 开发环境

- Node.js 22 或更新的受支持版本，执行 `npm ci`。
- Android：Java 21、Android SDK 36、Android Studio 或命令行工具；最低 Android 7.0（API 24）。
- iOS：Mac、Xcode 26 或更新版本及其支持的 iOS SDK，最低 iOS 15。真机安装还需要 Apple 签名；免费个人签名存在有效期及设备限制，商店 / TestFlight 发行需要相应开发者资格。版本要求见 [Capacitor 官方环境说明](https://capacitorjs.com/docs/getting-started/environment-setup)。

```bash
npm ci
npm run build
npm run mobile:sync
```

`mobile:sync` 将本地模式前端构建到 `mobile/www`，再同步到原生工程。不要在原生编译进行时再次执行同步，以免重建原生插件的中间产物。

### Android

```bash
npm run mobile:android
# 或使用命令行编译：
cd android
./gradlew --no-daemon assembleRelease
```

未配置签名时，得到 `android/app/build/outputs/apk/release/app-release-unsigned.apk`，不能作为已签名安装包分发。签名构建读取以下环境变量：

```text
XUEJI_KEYSTORE_PATH
XUEJI_KEYSTORE_PASSWORD
XUEJI_KEY_ALIAS
XUEJI_KEY_PASSWORD
```

将密钥库与密码保存在仓库外。不要提交密钥、密码、个人备份或真实截图。保留同一份签名密钥用于后续更新；丢失签名密钥将无法直接覆盖更新已有安装。

### iOS

```bash
npm run mobile:ios
```

在 Xcode 中打开 `ios/App/App.xcodeproj`，配置自己的 Bundle Identifier、开发团队和 Signing，再选择设备构建。工程使用 Swift Package Manager 解析 Capacitor。当前 Linux 开发环境不能直接运行 Xcode，也不能代替 Apple 为安装包签名。

[编译工作流示例](ci/mobile.yml) 可复制到 `.github/workflows/mobile.yml` 启用，需要具有工作流写入权限。它在 macOS 编译无签名 iOS 工程，并将结果明确标记为不可直接安装；编译通过不代表完成真机测试或签名发行。当前发布凭据没有工作流写入权限，因此尚未运行云端 iOS 编译。

## 验证与架构

```bash
npm test
npm run build:mobile
npx playwright test --config mobile-test.config.ts
```

- 网页版继续使用现有 API、数据库、密码验证与 Docker 部署方式。
- 只有设置 `VITE_LOCAL_APP=true` 的构建才启用手机本地适配器；不请求成绩服务器接口。
- 原生环境使用 Filesystem 保存档案与图片，Preferences 保存当前快照指针。浏览器测试环境使用独立 IndexedDB，不与网页后端共享数据。
- 成绩使用双快照提交，保存失败保留上一份档案；恢复前检查 ZIP 内容、关联关系和图片，并保留恢复前备份。损坏档案会显示错误，不会自动清空重建。
- App 与 Docker 版使用兼容的完整备份格式，可通过用户手动导出 / 导入迁移。

手机本地版不是网页端的远程壳，也不是 PWA；原生工程、离线前端与本地存储一同打包。
