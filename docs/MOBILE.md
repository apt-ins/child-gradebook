# 学迹 · Android 本地版

沿用学迹现有界面，使用 Capacitor 打包为 Android App。首次打开是一份空档案，无需账号、服务器或 Docker。考试、个人资料与成绩截图保存在应用私有目录，所有操作可离线完成。不同手机之间不会自动同步。

## 安装与数据保护

- [下载已签名的 Android 安装包](https://github.com/apt-ins/child-gradebook/releases/tag/android-v1.0.0)。
- Android：安装经过签名的 APK。更新时使用同一签名的新版覆盖安装；不要先卸载旧版。
- 在「档案工具」中导出完整 ZIP 备份，通过 Android 文件保存窗口选择位置保存。该备份包含资料、成绩和截图，应自行妥善保管。
- 换机后安装 App，在「档案工具」选择 ZIP，预览并输入确认文字后恢复。恢复会替换当前手机内的档案；请先导出当前档案。
- 卸载、清除应用数据、设备损坏可能造成记录丢失。请定期手动备份。导出 CSV 只包含表格，不代替完整 ZIP 备份。
- Android 已关闭应用云备份与设备迁移备份。导出文件的位置由用户自行选择。
- 本地 App 不使用网页端的密码系统，不提供独立登录。访问保护依靠手机锁屏与系统应用隔离。

## 开发环境

- Node.js 22 或更新的受支持版本，执行 `npm ci`。
- Android：Java 21、Android SDK 36、Android Studio 或命令行工具；最低 Android 7.0（API 24）。

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

[Android 编译工作流示例](ci/mobile.yml) 可复制到 `.github/workflows/mobile.yml` 启用，需要具有工作流写入权限。示例生成无签名 APK，正式安装包需单独签名。

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
