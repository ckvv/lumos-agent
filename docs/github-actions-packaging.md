# GitHub Actions 打包说明

仓库提供了一个跨平台 Electron 打包工作流：`.github/workflows/package-electron.yml`。

## 触发方式

- 手动触发：在 GitHub Actions 页面运行 `Package Electron App`
- Tag 触发：推送匹配 `v*` 的 tag，例如 `v1.0.0`

## 打包行为

工作流会在两个原生 runner 上分别执行 `pnpm make`：

- `macos-latest`
- `windows-latest`

这样可以直接复用 [`forge.config.ts`](../forge.config.ts) 里的 Electron Forge makers，而不需要做跨平台交叉打包。

## 产物位置

每个平台都会把 `out/make/` 下的构建结果上传成独立 artifact：

- `lumos-macos`
- `lumos-windows`

当前产物格式由 Electron Forge 配置决定：

- macOS：ZIP 包
- Windows：Squirrel 安装包及相关更新文件

## 注意事项

- 该工作流目前不包含代码签名和 notarization。
- 如果后续需要发布正式安装包，建议再补充 Apple / Windows 签名证书与 release 资产上传步骤。
