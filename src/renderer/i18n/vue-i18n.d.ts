import type { MessageSchema } from '#renderer/i18n/locales/zh-CN'
import 'vue-i18n'

declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends MessageSchema {}
}
