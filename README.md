# MUSE · 灵感收藏馆

一个参考 Atlas 交互方式的本地优先视觉素材库。由 VibeStart 0.1.3 创建，包含 Windows 桌面应用、响应式网页和 Expo iOS / Android 客户端。

## 使用

- 添加或拖入图片、视频；粘贴链接地址保存网页收藏。
- 创建收藏集，在详情中编辑标题、标签、喜欢状态和收藏集归属。
- 网格：瀑布流浏览，按类型、标签、名称和添加时间筛选。
- 画布：拖动素材自由编排，拖动空白区域漫游，位置自动保存。
- Infinity：向任意方向漫游连续的素材空间。
- 回收站：移入后可以恢复，不会永久删除文件。
- 设置：切换浅色 / 深色外观，导出或合并备份。
- 快捷键：Ctrl K 搜索，N 添加，1 / 2 / 3 切换视图。

网页和 Windows 使用 IndexedDB 保存素材与文件；手机原生端使用 SQLite 保存索引，并将导入文件复制到应用的文档目录。各端独立保存，尚无账户和自动云同步。网页 / Windows 的 JSON 备份可在两者之间迁移；手机原生端的备份互通尚未实现。浏览器清理站点数据会清除本机素材，请定期导出备份。示例素材已随应用打包；收藏的外部网页需要联网打开。

Windows 安装程序与免安装版本输出到 `apps/desktop/release`。手机浏览器可直接访问网站并添加到主屏幕。Expo 工程已经导出 iOS / Android 资源包，尚未进行真机验证或生成签名安装包。

## 开发

项目要求 Node.js 24.22.1、pnpm 12.15.0 和 Vite+。本机双击根目录 `Start-MUSE-Dev.cmd`（或运行 `Start-MUSE-Dev.ps1`）：网页界面修改会立即显示；Electron 主进程、预加载脚本及共享通信代码变动后，会自动重建并重新打开窗口。

本机工具放在 `.local/tools`，数据在 `.local/data/development`，临时文件和下载缓存在 `.local` 内；pnpm 复用当前盘根目录的 `.pnpm-store`。此前桌面数据已复制保存到 `.local/data/previous-desktop`。这些目录不上传 GitHub。启动入口仅修改当前进程的环境，不更改系统设置。

在其他电脑安装工具后，可运行：

```powershell
vp env exec --node 24.22.1 --package-manager pnpm@12.15.0 vp install
vp env exec --node 24.22.1 --package-manager pnpm@12.15.0 vp run dev
```

仅网页：在 `apps/web` 运行 `vp dev --host 0.0.0.0`。手机原生端：根目录运行 `vp run dev:mobile`。完整验证：`vp run ready`。Windows 打包：`vp run package:desktop`。

开发预览地址为 `http://localhost:5173`。桌面开发版的本机调试端口为 `127.0.0.1:9222`，正式安装包不开放该端口。网页端口被占用时会直接报错，避免桌面窗口误连到其他服务。开发版与正式版使用独立素材库，可通过导出备份迁移。

## 技术栈

| 范围     | 技术                                                                      |
| -------- | ------------------------------------------------------------------------- |
| Windows  | Electron 45、隔离预加载桥、electron-builder / NSIS                        |
| 网页     | React 19、TypeScript 7、Vite+ / Vite 8、TanStack Router、CSS / Tailwind 4 |
| 手机原生 | Expo 58、React Native 0.88、Expo Router                                   |
| 本地保存 | 网页 / 桌面 IndexedDB；原生手机 SQLite + FileSystem                       |
| 验证     | Vitest、Playwright、Oxlint、Oxfmt、类型检查                               |
| 软件更新 | electron-updater、GitHub Releases、GitHub Actions                         |

项目目前没有后端服务或云数据库。

## Windows 自动更新与发布

公开源码：[hoangmaituan882-hue/muse](https://github.com/hoangmaituan882-hue/muse)。更新配置指向该仓库的 GitHub Releases，不在应用内保存 GitHub 密钥。

安装版启动后及每六小时检查稳定版更新。设置中可以手动检查；发现新版后点击「下载更新」，下载校验完成后点击「重启安装」。应用不会在整理素材时自行退出。免安装版和实时开发版不执行安装更新。

未来发布一个新版：

```powershell
node scripts/set-version.mjs 0.1.1
git add .
git commit -m "Release 0.1.1"
git tag v0.1.1
git push origin main
git push origin v0.1.1
```

版本标签触发 `.github/workflows/release.yml`：检查版本一致、执行完整验证、构建 Windows 安装版及免安装版，再上传 `.exe`、`.blockmap` 和 `latest.yml`。安装版会从同一更新源发现新版。自动发布使用仓库内置的短期 `GITHUB_TOKEN`，不需要把个人令牌写入源码。正式分发前可在仓库 Secrets 中配置 Windows 签名证书；当前构建未签名。

本机安装程序默认位置为 `E:\MUSE`，也可选择其他可写目录。正式版把数据、缓存、日志和更新下载放在可执行程序旁的 `MUSE Data`；免安装版放在原始启动文件旁。更新不会删除此数据目录。请将软件保留在有写入权限的非系统盘；不要安装到需要管理员权限写入的目录。Windows 自身的系统日志、临时记录及 GitHub 云端构建机器的磁盘安排不由项目控制。

本机端到端测试使用已安装的 Microsoft Edge：

```powershell
$env:E2E_BROWSER_CHANNEL='msedge'
vp env exec --node 24.22.1 --package-manager pnpm@12.15.0 vp run ready
```

未设置此变量时，Playwright 使用自行安装的 Chromium。验证包括格式、类型、8 项桌面路由规则测试、5 条浏览器完整流程，以及网页 / 桌面 / iOS / Android 构建。图片导入、备份合并、标签、收藏集、喜欢、回收站恢复、画布位置持久化和手机布局均有浏览器测试覆盖。

## 目录

| 目录           | 内容                                    |
| -------------- | --------------------------------------- |
| `apps/web`     | React 网页、PWA、IndexedDB 与浏览器测试 |
| `apps/desktop` | Electron 桌面入口与 Windows 打包        |
| `apps/mobile`  | Expo 手机客户端                         |
| `packages`     | UI、配置与桌面通信约定                  |
| `artifacts`    | 桌面与手机网页预览图                    |

## 示例素材

摄影参考来自 Unsplash，按顺序对应 photo-1600607687939-ce8a6c25118c、photo-1470770841072-f978cf4d019e、photo-1600210492486-724fe5c67fb0、photo-1567538096630-e0c55bd6374c、photo-1578749556568-bc2c40e68b61、photo-1416879595882-3373a0480b5b、photo-1600585154340-be6161a56a0c、photo-1500375592092-40eb2168fd21、photo-1494438639946-1ebd1d20bf85、photo-1600210491892-03d54c0aaf87、photo-1464822759023-fed622ff2c3b、photo-1616486338812-3dadae4b4ace。四张排版海报及品牌图形在项目中原创制作。视频为 MDN 的 [CC0 Flower 示例](https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4)，封面由其第一秒画面提取。

设计参考：[Atlas for Mac](https://atlasformac.com/)。MUSE 是独立实现的应用。
