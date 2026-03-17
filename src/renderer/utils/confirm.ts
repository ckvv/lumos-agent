export function confirmAction(message: string) {
  // Electron 桌面流程这里需要同步确认，避免误删会话或配置。
  // eslint-disable-next-line no-alert
  return window.confirm(message)
}
