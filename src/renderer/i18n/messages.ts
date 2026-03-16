import type { MessageSchema } from '#renderer/i18n/locales/zh-CN'
import { en } from '#renderer/i18n/locales/en'
import { zhCN } from '#renderer/i18n/locales/zh-CN'

export const messages = {
  'zh-CN': zhCN,
  en,
} satisfies Record<string, MessageSchema>

export type AppLocale = keyof typeof messages
