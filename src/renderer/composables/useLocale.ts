import type { AppLocale } from '#renderer/i18n'
import type { WritableComputedRef } from 'vue'
import { i18n, setLocale, SUPPORTED_LOCALES } from '#renderer/i18n'
import { computed } from 'vue'

export type { AppLocale } from '#renderer/i18n'

export interface LocaleOption {
  labelKey: `locale.${AppLocale}`
  value: AppLocale
}

const localeOptions = SUPPORTED_LOCALES.map(locale => ({
  labelKey: `locale.${locale}`,
  value: locale,
})) satisfies LocaleOption[]

export function useLocale() {
  const i18nLocale = i18n.global.locale as WritableComputedRef<AppLocale>

  const locale = computed<AppLocale>({
    get: () => i18nLocale.value,
    set: (value: AppLocale) => {
      setLocale(value)
    },
  })

  return {
    locale,
    localeOptions,
  }
}
