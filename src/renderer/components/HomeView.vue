<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const highlights = [
  {
    titleKey: 'home.highlights.stack.title',
    bodyKey: 'home.highlights.stack.body',
  },
  {
    titleKey: 'home.highlights.desktop.title',
    bodyKey: 'home.highlights.desktop.body',
  },
  {
    titleKey: 'home.highlights.scale.title',
    bodyKey: 'home.highlights.scale.body',
  },
]

const quickStartSteps = [
  'home.quickStart.install',
  'home.quickStart.dev',
  'home.quickStart.package',
]
</script>

<template>
  <section class="grid gap-6">
    <UCard
      class="overflow-hidden border-accented bg-default/90 shadow-xl"
      variant="subtle"
    >
      <template #header>
        <div class="grid gap-5">
          <div class="flex flex-wrap gap-2">
            <UBadge
              color="primary"
              :label="t('home.eyebrow')"
              variant="soft"
            />
            <UBadge
              color="neutral"
              :label="t('home.meta.runtime')"
              variant="subtle"
            />
            <UBadge
              color="neutral"
              :label="t('home.meta.router')"
              variant="subtle"
            />
            <UBadge
              color="neutral"
              :label="t('home.meta.i18n')"
              variant="subtle"
            />
          </div>

          <div class="grid gap-3">
            <h2 class="m-0 max-w-4xl text-[clamp(1.8rem,4vw,3rem)] font-semibold tracking-tight text-highlighted">
              {{ t('home.title') }}
            </h2>
            <p class="m-0 max-w-[64ch] text-base leading-8 text-toned">
              {{ t('home.body') }}
            </p>
          </div>
        </div>
      </template>
    </UCard>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
      <UCard
        class="border-accented bg-default/90 shadow-lg"
        variant="subtle"
      >
        <template #header>
          <div class="grid gap-2">
            <UBadge
              class="w-fit"
              color="primary"
              :label="t('home.sections.highlights')"
              variant="soft"
            />
            <h3 class="m-0 text-xl font-semibold text-highlighted">
              {{ t('home.sections.highlights') }}
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

      <UCard
        class="border-accented bg-default/90 shadow-lg"
        variant="subtle"
      >
        <template #header>
          <div class="grid gap-2">
            <UBadge
              class="w-fit"
              color="secondary"
              :label="t('home.sections.quickStart')"
              variant="soft"
            />
            <h3 class="m-0 text-xl font-semibold text-highlighted">
              {{ t('home.quickStart.title') }}
            </h3>
          </div>
        </template>

        <div class="grid gap-4">
          <div
            v-for="(step, index) in quickStartSteps"
            :key="step"
            class="flex items-center gap-3 rounded-2xl bg-elevated/80 p-3 ring ring-default"
          >
            <UBadge
              color="secondary"
              :label="String(index + 1)"
              variant="solid"
            />
            <code class="font-mono text-sm text-highlighted">{{ t(step) }}</code>
          </div>

          <p class="m-0 text-sm leading-7 text-toned">
            {{ t('home.quickStart.note') }}
          </p>
        </div>
      </UCard>
    </div>

    <RuntimeBridgeCard />
  </section>
</template>
