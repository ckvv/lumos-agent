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
    <header class="grid gap-4 rounded-[1.6rem] border border-default/70 bg-default/92 p-5 shadow-sm sm:p-6">
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
        <h1 class="m-0 max-w-4xl text-[clamp(2rem,5vw,3.3rem)] font-semibold tracking-tight text-highlighted">
          {{ t('about.title') }}
        </h1>
        <p class="m-0 max-w-[72ch] text-sm leading-7 text-toned sm:text-base">
          {{ t('about.body') }}
        </p>
      </div>
    </header>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
      <UCard
        class="border-default/70 bg-default/92 shadow-sm"
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
            <h2 class="m-0 text-lg font-semibold text-highlighted">
              {{ t('about.sections.highlights') }}
            </h2>
          </div>
        </template>

        <div class="grid gap-5">
          <section
            v-for="item in highlights"
            :key="item.titleKey"
            class="grid gap-2 border-t border-default/60 pt-5 first:border-t-0 first:pt-0"
          >
            <h3 class="m-0 text-base font-semibold text-highlighted">
              {{ t(item.titleKey) }}
            </h3>
            <p class="m-0 leading-7 text-toned">
              {{ t(item.bodyKey) }}
            </p>
          </section>
        </div>
      </UCard>

      <div class="grid gap-5">
        <UCard
          class="border-default/70 bg-default/92 shadow-sm"
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
              <h2 class="m-0 text-lg font-semibold text-highlighted">
                {{ t('about.futureTitle') }}
              </h2>
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
        </UCard>

        <UCard
          class="border-default/70 bg-default/92 shadow-sm"
          variant="subtle"
        >
          <template #header>
            <h2 class="m-0 text-lg font-semibold text-highlighted">
              {{ t('about.orpc.title') }}
            </h2>
          </template>

          <p class="m-0 text-sm leading-7 text-toned">
            {{ t('about.orpc.body') }}
          </p>
        </UCard>
      </div>
    </div>
  </section>
</template>
