<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const highlights = [
  {
    titleKey: 'about.highlights.providers.title',
    bodyKey: 'about.highlights.providers.body',
  },
  {
    titleKey: 'about.highlights.workspace.title',
    bodyKey: 'about.highlights.workspace.body',
  },
  {
    titleKey: 'about.highlights.persistence.title',
    bodyKey: 'about.highlights.persistence.body',
  },
]

const futureCapabilities = [
  'about.future.tools',
  'about.future.mcp',
  'about.future.skills',
]
</script>

<template>
  <section class="grid gap-6">
    <div class="grid gap-6 overflow-hidden rounded-[2.4rem] border border-default/70 bg-default/92 p-6 shadow-2xl shadow-slate-200/65 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:p-8">
      <div class="grid gap-5">
        <div class="flex flex-wrap gap-2">
          <UBadge
            color="primary"
            :label="t('about.eyebrow')"
            variant="soft"
          />
          <UBadge
            color="neutral"
            :label="t('about.meta.runtime')"
            variant="soft"
          />
          <UBadge
            color="neutral"
            :label="t('about.meta.storage')"
            variant="soft"
          />
        </div>

        <div class="grid gap-3">
          <h1 class="m-0 max-w-5xl text-[clamp(2.2rem,6vw,4.6rem)] font-semibold leading-none tracking-tight text-highlighted">
            {{ t('about.title') }}
          </h1>
          <p class="m-0 max-w-[64ch] text-base leading-8 text-toned">
            {{ t('about.body') }}
          </p>
        </div>

        <UCard
          class="border-default/70 bg-elevated/70 shadow-lg"
          variant="subtle"
        >
          <template #header>
            <div class="grid gap-2">
              <UBadge
                class="w-fit"
                color="primary"
                :label="t('about.sections.highlights')"
                variant="soft"
              />
              <h3 class="m-0 text-xl font-semibold text-highlighted">
                {{ t('about.sections.highlights') }}
              </h3>
            </div>
          </template>

          <div class="grid gap-5">
            <section
              v-for="item in highlights"
              :key="item.titleKey"
              class="grid gap-2 border-default/60 pt-5 first:border-t-0 first:pt-0"
            >
              <h4 class="m-0 text-base font-semibold text-highlighted">
                {{ t(item.titleKey) }}
              </h4>
              <p class="m-0 leading-7 text-toned">
                {{ t(item.bodyKey) }}
              </p>
            </section>
          </div>
        </UCard>
      </div>

      <UCard
        class="border-default/70 bg-elevated/70 shadow-lg"
        variant="subtle"
      >
        <template #header>
          <div class="grid gap-2">
            <UBadge
              class="w-fit"
              color="secondary"
              :label="t('about.sections.future')"
              variant="soft"
            />
            <h3 class="m-0 text-xl font-semibold text-highlighted">
              {{ t('about.futureTitle') }}
            </h3>
          </div>
        </template>

        <ul class="m-0 grid gap-3 pl-5 text-sm leading-7 text-toned marker:text-secondary">
          <li
            v-for="item in futureCapabilities"
            :key="item"
          >
            {{ t(item) }}
          </li>
        </ul>

        <div class="mt-6 grid gap-3 rounded-[1.5rem] border border-default/70 bg-default/80 p-4">
          <h4 class="m-0 text-base font-semibold text-highlighted">
            {{ t('about.orpc.title') }}
          </h4>
          <p class="m-0 text-sm leading-7 text-toned">
            {{ t('about.orpc.body') }}
          </p>
        </div>
      </UCard>
    </div>
  </section>
</template>
