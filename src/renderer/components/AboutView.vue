<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const boundaries = [
  {
    titleKey: 'about.boundaries.main.title',
    bodyKey: 'about.boundaries.main.body',
  },
  {
    titleKey: 'about.boundaries.preload.title',
    bodyKey: 'about.boundaries.preload.body',
  },
  {
    titleKey: 'about.boundaries.renderer.title',
    bodyKey: 'about.boundaries.renderer.body',
  },
]

const scenarios = [
  'about.scenarios.settings',
  'about.scenarios.integrations',
  'about.scenarios.distribution',
]
</script>

<template>
  <section class="grid gap-6">
    <UCard
      class="border-accented bg-default/90 shadow-xl"
      variant="subtle"
    >
      <template #header>
        <div class="grid gap-3">
          <UBadge
            class="w-fit"
            color="primary"
            :label="t('about.eyebrow')"
            variant="soft"
          />
          <h2 class="m-0 max-w-4xl text-[clamp(1.8rem,4vw,3rem)] font-semibold tracking-tight text-highlighted">
            {{ t('about.title') }}
          </h2>
          <p class="m-0 max-w-[64ch] text-base leading-8 text-toned">
            {{ t('about.body') }}
          </p>
        </div>
      </template>
    </UCard>

    <div class="grid gap-6 lg:grid-cols-2">
      <UCard
        class="border-accented bg-default/90 shadow-lg"
        variant="subtle"
      >
        <template #header>
          <div class="grid gap-2">
            <UBadge
              class="w-fit"
              color="primary"
              :label="t('about.sections.boundaries')"
              variant="soft"
            />
            <h3 class="m-0 text-xl font-semibold text-highlighted">
              {{ t('about.sections.boundaries') }}
            </h3>
          </div>
        </template>

        <div class="grid gap-5">
          <section
            v-for="item in boundaries"
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

      <UCard
        class="border-accented bg-default/90 shadow-lg"
        variant="subtle"
      >
        <template #header>
          <div class="grid gap-2">
            <UBadge
              class="w-fit"
              color="secondary"
              :label="t('about.sections.scenarios')"
              variant="soft"
            />
            <h3 class="m-0 text-xl font-semibold text-highlighted">
              {{ t('about.scenariosTitle') }}
            </h3>
          </div>
        </template>

        <ul class="m-0 grid gap-3 pl-5 text-base leading-7 text-toned marker:text-secondary">
          <li
            v-for="scenario in scenarios"
            :key="scenario"
          >
            {{ t(scenario) }}
          </li>
        </ul>
      </UCard>
    </div>
  </section>
</template>
