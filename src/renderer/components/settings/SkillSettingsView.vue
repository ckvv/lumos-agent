<script setup lang="ts">
import { useSkillSettings } from '#renderer/composables/useSkillSettings'
import { confirmAction } from '#renderer/utils/confirm'
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const skillSettings = useSkillSettings()

async function handleDelete(id: string) {
  if (!confirmAction(t('settings.skills.confirmDelete')))
    return

  await skillSettings.deleteSkill(id)
}

onMounted(async () => {
  await skillSettings.load()
})
</script>

<template>
  <section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
    <UCard
      class="border-default/70 bg-default/92 shadow-sm"
      variant="subtle"
    >
      <template #header>
        <div class="grid gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              color="primary"
              :label="t('settings.skills.eyebrow')"
              variant="soft"
            />
            <UBadge
              color="neutral"
              :label="t('settings.skills.summary.enabled', { count: skillSettings.activeSkills.value.length })"
              variant="soft"
            />
          </div>
          <h2 class="m-0 text-lg font-semibold text-highlighted">
            {{ t('settings.skills.title') }}
          </h2>
          <p class="m-0 text-sm leading-7 text-toned">
            {{ t('settings.skills.body') }}
          </p>
        </div>
      </template>

      <div class="grid gap-4">
        <UAlert
          v-if="skillSettings.errorMessage.value || skillSettings.actionErrorMessage.value"
          color="error"
          :description="skillSettings.actionErrorMessage.value ?? skillSettings.errorMessage.value ?? ''"
          :title="t('settings.errors.title')"
          variant="soft"
        />

        <UAlert
          color="neutral"
          :description="skillSettings.rootPath.value"
          :title="t('settings.skills.rootPath')"
          variant="soft"
        />

        <UAlert
          v-if="skillSettings.skills.value.length === 0"
          color="warning"
          :description="t('settings.skills.emptyBody')"
          :title="t('settings.skills.emptyTitle')"
          variant="soft"
        />

        <UCard
          v-for="skill in skillSettings.skills.value"
          :key="skill.id"
          class="border-default/70 bg-default/96"
          variant="subtle"
        >
          <template #header>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="grid gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="m-0 text-base font-semibold text-highlighted">
                    {{ skill.name }}
                  </h3>
                  <UBadge
                    :color="skill.isEnabled ? 'primary' : 'neutral'"
                    :label="skill.isEnabled ? t('settings.states.enabled') : t('settings.states.disabled')"
                    variant="soft"
                  />
                  <UBadge
                    v-if="skill.disableModelInvocation"
                    color="warning"
                    :label="t('settings.skills.explicitOnly')"
                    variant="soft"
                  />
                  <UBadge
                    v-if="skill.hasWarnings"
                    color="warning"
                    :label="t('settings.states.warning')"
                    variant="soft"
                  />
                </div>
                <p class="m-0 text-sm text-toned">
                  {{ skill.relativePath }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <UButton
                  color="neutral"
                  :label="t('settings.actions.details')"
                  variant="soft"
                  @click="skillSettings.selectSkill(skill.id)"
                />
                <UButton
                  :color="skill.isEnabled ? 'warning' : 'primary'"
                  :label="skill.isEnabled ? t('settings.actions.disable') : t('settings.actions.enable')"
                  @click="skillSettings.setEnabled(skill.id, !skill.isEnabled)"
                />
                <UButton
                  color="error"
                  :label="t('settings.actions.delete')"
                  variant="soft"
                  @click="handleDelete(skill.id)"
                />
              </div>
            </div>
          </template>

          <div class="grid gap-2">
            <p class="m-0 text-sm leading-7 text-toned">
              {{ skill.description || t('settings.skills.noDescription') }}
            </p>
            <div
              v-if="skill.diagnostics.length > 0"
              class="grid gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-6 text-toned"
            >
              <p
                v-for="diagnostic in skill.diagnostics"
                :key="`${skill.id}:${diagnostic.path}:${diagnostic.message}`"
                class="m-0"
              >
                {{ diagnostic.message }}
              </p>
            </div>
          </div>
        </UCard>
      </div>
    </UCard>

    <UCard
      v-if="skillSettings.selectedSkillDetail.value"
      class="border-default/70 bg-default/92 shadow-sm"
      variant="subtle"
    >
      <template #header>
        <div class="grid gap-1">
          <h3 class="m-0 text-base font-semibold text-highlighted">
            {{ t('settings.skills.detailTitle', { name: skillSettings.selectedSkillDetail.value.name }) }}
          </h3>
          <p class="m-0 text-sm text-toned">
            {{ skillSettings.selectedSkillDetail.value.filePath }}
          </p>
        </div>
      </template>

      <div class="grid gap-4">
        <div class="grid gap-2">
          <UBadge
            class="w-fit"
            color="neutral"
            :label="t('settings.skills.detailMetadata')"
            variant="soft"
          />
          <pre class="overflow-x-auto rounded-xl border border-default/70 bg-muted/40 p-3 text-xs leading-6 text-toned">{{ JSON.stringify(skillSettings.selectedSkillDetail.value.frontmatter, null, 2) }}</pre>
        </div>

        <div class="grid gap-2">
          <UBadge
            class="w-fit"
            color="neutral"
            :label="t('settings.skills.detailContent')"
            variant="soft"
          />
          <pre class="overflow-x-auto rounded-xl border border-default/70 bg-muted/40 p-3 text-xs leading-6 text-toned">{{ skillSettings.selectedSkillDetail.value.rawContent }}</pre>
        </div>
      </div>
    </UCard>
  </section>
</template>
