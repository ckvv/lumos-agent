# GitHub Actions 打包说明

仓库提供了一个跨平台 Electron 打包工作流：`.github/workflows/package-electron.yml`。

## 触发方式

- 手动触发：在 GitHub Actions 页面运行 `Package Electron App`
- Tag 触发：推送匹配 `v*` 的 tag，例如 `v1.0.0`

## 打包行为

工作流会在三个原生 runner / 目标组合上分别执行打包：

- `macos-latest` + `darwin/arm64`
- `macos-15-intel` + `darwin/x64`
- `windows-latest` + `win32/x64`

工作流会显式执行：

```bash
pnpm exec electron-forge make --platform=<target> --arch=<arch>
```

这样可以直接复用 [`forge.config.ts`](../forge.config.ts) 里的 Electron Forge makers，同时明确区分 Intel Mac 和 Apple Silicon Mac 产物，而不依赖 runner 默认架构。

## 产物位置

工作流始终会把 `out/make/` 下的构建结果上传成独立 Actions artifact：

- `lumos-macos-arm64`
- `lumos-macos-x64`
- `lumos-windows-x64`

当工作流由 `v*` tag 触发时，还会自动创建或复用同名 GitHub Release，并把 `out/make/` 下的实际构建文件上传到 release assets。

当前产物格式由 Electron Forge 配置决定：

- macOS ARM64：ZIP 包，适用于 Apple Silicon（M1/M2/M3/M4）
- macOS x64：ZIP 包，适用于 Intel Mac
- Windows：Squirrel 安装包及相关更新文件

## 注意事项

- 该工作流目前不包含代码签名和 notarization。
- 手动在分支上触发时，只会生成 Actions artifact，不会上传到 GitHub Release。
- 如果后续需要发布正式安装包，建议再补充 Apple / Windows 签名证书与 notarization。
