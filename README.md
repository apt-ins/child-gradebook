# 学迹

一份陪伴孩子成长的私人求学纪念册。记录考试、回看学科变化，也把每一次认真留给未来。

> 下方截图和仓库内的测试数据均为虚构示例，不包含真实孩子的资料或成绩。

![学迹桌面预览](docs/screenshots/desktop.png)

<details>
<summary>查看手机预览</summary>

![学迹手机预览](docs/screenshots/mobile.png)

</details>

## 能做什么

- 按时间浏览考试，记录月考、期中、期末和自定义考试名称。
- 记录各科得分、满分、总分、班级排名和年级排名；按学期筛选。
- 查看各科与总分趋势、比较不同考试，也可以附上成绩查询截图。
- 在手机和桌面使用；支持 ZIP 备份、恢复与 CSV 导出。
- 通过 Home Assistant 验证访问者，无需另建成绩册账号。

## 安装与接入 Home Assistant

本项目需要已有的 Home Assistant 和 Docker Compose。成绩册作为 Home Assistant 内嵌页面使用，直接访问成绩册端口会提示从 Home Assistant 打开。请先确保 Home Assistant 用户可以访问其首页；服务端验证时会读取默认仪表盘 `lovelace` 中 `path: home` 的视图，返回按钮也指向 `/lovelace/home`。如你的首页路径不同，需要先在默认仪表盘中配置该视图路径。

### 1. 启动服务

```bash
git clone https://github.com/apt-ins/child-gradebook.git
cd child-gradebook
cp .env.example .env
```

修改 `.env`：

- `HA_INTERNAL_URL`：**成绩册容器能访问到的** Home Assistant 地址，例如同一 Docker 网络中的 `http://homeassistant:8123`。容器与 HA 不在同一网络时，请改为实际可达的地址。
- `FRAME_ANCESTORS`：允许嵌入成绩册的 Home Assistant 完整来源，包含协议及端口；多个来源用空格分隔。必须与浏览器访问 HA 时的地址一致。
- `TRUSTED_PROXY_CIDRS`：仅在使用可信反向代理时填写代理的精确 CIDR；不使用时留空。HTTPS 反代需正确转发协议，并配置可信代理，才能自动设置安全 Cookie。
- `APP_PORT`：成绩册端口，默认 `3082`。请保证 Home Assistant 页面所在浏览器能访问该端口。

```bash
mkdir -p data
# 容器以 UID 1000 运行，确保 data 对该用户可写。
sudo chown 1000:1000 data
docker compose up -d --build
docker compose ps
```

数据保存在项目目录的 `data/` 中；更新镜像前请备份该目录或使用页面内的备份功能。不要将 `.env`、`data/`、备份文件或个人截图上传到公开仓库。

### 2. 添加页面组件

把 `ha/gradebook-frame.js` 复制到 Home Assistant 配置目录的 `www/gradebook-frame.js`。在 Home Assistant 的仪表盘资源中添加 `/local/gradebook-frame.js`，资源类型选择 JavaScript 模块。新建一个仪表盘及视图，在手动卡片中添加以下示例，并替换成自己实际使用的地址：

```yaml
type: custom:gradebook-frame-v3
local_port: 3082
local_ha_origins:
  - http://192.0.2.10:8123
```

示例地址仅用于说明。局域网模式下，组件使用当前 HA 主机名和 `local_port` 访问成绩册；确保该主机名及端口确实可达，并与 `.env` 中的 `FRAME_ANCESTORS` 相匹配。组件使用独立全屏画布显示成绩册；可按个人仪表盘的方式添加一个入口。

使用 HTTPS 外网反向代理时，在上述卡片配置中再添加：

```yaml
external_ha_origins:
  - https://ha.example.com
external_url: https://grades.example.com
```

`external_url` 必须是 HTTPS 来源，不能包含路径或凭据。将外网 HA 来源同时加入 `FRAME_ANCESTORS`，并确保反向代理能转发到成绩册。成绩册会话 Cookie 使用 `SameSite=Strict`：HA 和成绩册应使用同一站点下的域名；浏览器的跨站 Cookie 限制也可能影响其他部署方式。上面的域名均是示例，请自行配置 DNS、HTTPS 和反向代理。

## 开发与测试

需要 Node.js 22、npm 和可用的 Chromium：

```bash
npm ci
npm run build
npm test
n# 首次使用 Playwright 时按提示安装 Chromium 和系统依赖
npx playwright install chromium
npx playwright test
```

浏览器测试使用隔离的模拟 HA 和临时数据库；不会连接你的真实 HA。测试中的示例成绩和截图均为虚构数据。

## 技术与许可

前端使用 Vue 3、TypeScript、Vite；服务端使用 Express 和 SQLite。项目采用 [MIT 许可证](LICENSE)。随项目提供的 D-DIN 字体有独立许可，详见 `public/fonts/` 中的许可文件。
