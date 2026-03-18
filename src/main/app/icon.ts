import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { app, nativeImage } from 'electron'

function resolveIconPath(fileName: string) {
  const candidates = app.isPackaged
    ? [path.join(app.getAppPath(), 'icons', fileName)]
    : [path.join(app.getAppPath(), 'icons', fileName), path.join(process.cwd(), 'icons', fileName)]

  return candidates.find(candidate => existsSync(candidate)) ?? null
}

export function applyMacAppIcon() {
  if (process.platform !== 'darwin' || !app.dock)
    return

  const iconPath = resolveIconPath('512x512.png')

  // `packagerConfig.icon` 只影响 package/make，开发态需要手动设置 Dock 图标。
  if (iconPath)
    app.dock.setIcon(iconPath)
}

export function getWindowIcon() {
  const iconPath = resolveIconPath('32x32.png')

  if (!iconPath)
    return undefined

  const icon = nativeImage.createFromPath(iconPath)
  return icon.isEmpty() ? undefined : icon
}
