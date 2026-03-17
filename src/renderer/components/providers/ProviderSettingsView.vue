<script setup lang="ts">
import type { CompatibleProviderCompat, ProviderConfigDetail } from '#shared/chat/types'
import { useAppBootstrap } from '#renderer/composables/useAppBootstrap'
import { useProviderSettings } from '#renderer/composables/useProviderSettings'
import { confirmAction } from '#renderer/utils/confirm'
import { computed, onMounted, reactive, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const bootstrap = useAppBootstrap()
const providerSettings = useProviderSettings()

const builtinApiKeyProviders = [
  {
    id: 'openai',
    labelKey: 'providers.apiKey.openai',
  },
  {
    id: 'anthropic',
    labelKey: 'providers.apiKey.anthropic',
  },
  {
    id: 'google',
    labelKey: 'providers.apiKey.google',
  },
] as const

const builtinApiKeys = reactive<Record<string, string>>({
  anthropic: '',
  google: '',
  openai: '',
})

const compatibleForm = reactive<{
  apiKey: string
  baseUrl: string
  displayName: string
  id?: number
}>({
  apiKey: '',
  baseUrl: '',
  displayName: '',
})

const manualModelForms = reactive<Record<number, {
  contextWindow: number
  maxTokens: number
  modelId: string
  name: string
  reasoning: boolean
  supportsImageInput: boolean
}>>({})

const manualCode = shallowRef('')

const compatibleConfigs = computed(() =>
  providerSettings.configs.value.filter(config => config.kind === 'openaiCompatible'),
)

const oauthConfigs = computed(() =>
  providerSettings.configs.value.filter(config => config.authMode === 'oauth'),
)

function getBuiltinConfig(providerId: string) {
  return providerSettings.configs.value.find(config =>
    config.kind === 'builtin'
    && config.authMode === 'apiKey'
    && config.providerId === providerId,
  ) ?? null
}

function getOAuthConfig(providerId: string) {
  return oauthConfigs.value.find(config => config.providerId === providerId) ?? null
}

function getManualModelForm(providerConfigId: number) {
  if (!manualModelForms[providerConfigId]) {
    manualModelForms[providerConfigId] = {
      contextWindow: 131072,
      maxTokens: 32768,
      modelId: '',
      name: '',
      reasoning: false,
      supportsImageInput: false,
    }
  }

  return manualModelForms[providerConfigId]
}

function resetCompatibleForm() {
  compatibleForm.apiKey = ''
  compatibleForm.baseUrl = ''
  compatibleForm.displayName = ''
  delete compatibleForm.id
}

async function refreshBootstrapAndMaybeRedirect() {
  const previouslyHadUsableProvider = bootstrap.hasUsableProvider.value
  await refreshBootstrapAfterProviderMutation(previouslyHadUsableProvider)
}

async function refreshBootstrapAfterProviderMutation(previouslyHadUsableProvider: boolean, allowRedirect = true) {
  await bootstrap.refreshBootstrap()

  if (!allowRedirect)
    return

  if (!previouslyHadUsableProvider && bootstrap.hasUsableProvider.value)
    await router.replace('/chat')
}

async function handleSaveBuiltinApiKey(providerId: string) {
  await providerSettings.saveBuiltinApiKeyConfig(providerId, builtinApiKeys[providerId])
  builtinApiKeys[providerId] = ''
  await refreshBootstrapAndMaybeRedirect()
}

async function handleSaveCompatibleProvider() {
  await providerSettings.saveCompatibleProviderConfig({
    apiKey: compatibleForm.apiKey || undefined,
    baseUrl: compatibleForm.baseUrl,
    compat: null satisfies CompatibleProviderCompat | null,
    displayName: compatibleForm.displayName,
    id: compatibleForm.id,
  })

  resetCompatibleForm()
  await refreshBootstrapAndMaybeRedirect()
}

async function handleDeleteConfig(id: number) {
  if (!confirmAction(t('providers.compatible.confirmDelete')))
    return

  await providerSettings.deleteConfig(id)
  await refreshBootstrapAfterProviderMutation(bootstrap.hasUsableProvider.value, false)
}

async function handleToggleConfig(config: Readonly<ProviderConfigDetail>) {
  const previouslyHadUsableProvider = bootstrap.hasUsableProvider.value
  await providerSettings.setEnabled(config.id, !config.isEnabled)
  await refreshBootstrapAfterProviderMutation(previouslyHadUsableProvider)
}

async function handleSyncCompatibleModels(id: number) {
  const previouslyHadUsableProvider = bootstrap.hasUsableProvider.value
  await providerSettings.syncCompatibleModels(id)
  await refreshBootstrapAfterProviderMutation(previouslyHadUsableProvider)
}

async function handleSaveManualModel(providerConfigId: number) {
  const previouslyHadUsableProvider = bootstrap.hasUsableProvider.value
  const form = getManualModelForm(providerConfigId)

  await providerSettings.saveCompatibleModel({
    contextWindow: form.contextWindow,
    maxTokens: form.maxTokens,
    modelId: form.modelId,
    name: form.name,
    providerConfigId,
    reasoning: form.reasoning,
    supportsImageInput: form.supportsImageInput,
  })

  manualModelForms[providerConfigId] = {
    contextWindow: 131072,
    maxTokens: 32768,
    modelId: '',
    name: '',
    reasoning: false,
    supportsImageInput: false,
  }
  await refreshBootstrapAfterProviderMutation(previouslyHadUsableProvider)
}

async function handleDeleteManualModel(providerConfigId: number, modelId: string) {
  if (!confirmAction(t('providers.compatible.confirmDeleteModel')))
    return

  await providerSettings.deleteCompatibleModel(providerConfigId, modelId)
  await refreshBootstrapAfterProviderMutation(bootstrap.hasUsableProvider.value, false)
}

async function handleStartOAuth(providerId: string) {
  manualCode.value = ''
  await providerSettings.startOAuthLogin(providerId)
}

async function handleSubmitManualCode() {
  if (!providerSettings.oauthState.value.sessionId || !manualCode.value.trim())
    return

  await providerSettings.submitManualOAuthCode(
    providerSettings.oauthState.value.sessionId,
    manualCode.value,
  )
  manualCode.value = ''
}

function handleEditCompatibleConfig(config: Readonly<ProviderConfigDetail>) {
  compatibleForm.apiKey = ''
  compatibleForm.baseUrl = config.baseUrl ?? ''
  compatibleForm.displayName = config.displayName
  compatibleForm.id = config.id
}

onMounted(async () => {
  await providerSettings.load()
})

watch(
  () => providerSettings.oauthState.value.event?.type,
  async (eventType) => {
    if (eventType !== 'success')
      return

    await refreshBootstrapAndMaybeRedirect()
  },
)
</script>

<template>
  <section class="grid gap-5">
    <header class="grid gap-3 rounded-[1.6rem] border border-default/70 bg-default/92 p-5 shadow-sm">
      <div class="flex flex-wrap items-center gap-3">
        <UBadge
          color="primary"
          :label="t('providers.eyebrow')"
          variant="soft"
        />
        <UBadge
          color="neutral"
          :label="t('providers.summary.configured', { count: providerSettings.configs.value.length })"
          variant="soft"
        />
        <UBadge
          v-if="bootstrap.bootstrapState.value?.providerSummary.usesPlaintextFallback"
          color="warning"
          :label="t('providers.summary.plaintextWarning')"
          variant="soft"
        />
      </div>
      <div class="grid gap-2">
        <h2 class="m-0 text-xl font-semibold text-highlighted sm:text-2xl">
          {{ t('providers.title') }}
        </h2>
        <p class="m-0 max-w-3xl text-sm leading-7 text-toned">
          {{ t('providers.body') }}
        </p>
      </div>
    </header>

    <UAlert
      v-if="providerSettings.errorMessage.value || providerSettings.actionErrorMessage.value"
      color="error"
      :description="providerSettings.actionErrorMessage.value ?? providerSettings.errorMessage.value ?? ''"
      :title="t('providers.errors.title')"
      variant="soft"
    />

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <UCard
        class="border-default/70 bg-default/92 shadow-sm"
        variant="subtle"
      >
        <template #header>
          <div class="grid gap-2">
            <UBadge
              class="w-fit"
              color="primary"
              :label="t('providers.sections.apiKey')"
              variant="soft"
            />
            <h3 class="m-0 text-lg font-semibold text-highlighted">
              {{ t('providers.sections.apiKey') }}
            </h3>
          </div>
        </template>

        <div class="grid gap-4">
          <article
            v-for="provider in builtinApiKeyProviders"
            :key="provider.id"
            class="grid gap-3 rounded-[1.25rem] border border-default/70 bg-elevated/55 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="grid gap-1">
                <h4 class="m-0 text-base font-semibold text-highlighted">
                  {{ t(provider.labelKey) }}
                </h4>
                <p class="m-0 text-xs text-toned">
                  {{
                    getBuiltinConfig(provider.id)?.isUsable
                      ? t('providers.state.ready')
                      : t('providers.state.missing')
                  }}
                </p>
              </div>

              <UBadge
                :color="getBuiltinConfig(provider.id)?.isUsable ? 'success' : 'warning'"
                :label="getBuiltinConfig(provider.id)?.isUsable ? t('providers.state.connected') : t('providers.state.notConnected')"
                variant="soft"
              />
            </div>

            <UInput
              v-model="builtinApiKeys[provider.id]"
              :placeholder="t('providers.apiKey.placeholder')"
              type="password"
            />

            <div class="flex flex-wrap items-center justify-between gap-3">
              <UButton
                class="rounded-full"
                color="primary"
                :disabled="providerSettings.isSaving.value || !builtinApiKeys[provider.id].trim()"
                :label="t('providers.apiKey.save')"
                @click="handleSaveBuiltinApiKey(provider.id)"
              />
              <UButton
                v-if="getBuiltinConfig(provider.id)"
                class="rounded-full"
                color="neutral"
                :label="getBuiltinConfig(provider.id)?.isEnabled ? t('providers.actions.disable') : t('providers.actions.enable')"
                variant="outline"
                @click="handleToggleConfig(getBuiltinConfig(provider.id)!)"
              />
            </div>
          </article>
        </div>
      </UCard>

      <UCard
        class="border-default/70 bg-default/92 shadow-sm"
        variant="subtle"
      >
        <template #header>
          <div class="grid gap-2">
            <UBadge
              class="w-fit"
              color="secondary"
              :label="t('providers.sections.oauth')"
              variant="soft"
            />
            <h3 class="m-0 text-lg font-semibold text-highlighted">
              {{ t('providers.sections.oauth') }}
            </h3>
          </div>
        </template>

        <div class="grid gap-4">
          <article
            v-for="provider in providerSettings.oauthProviders.value"
            :key="provider.id"
            class="grid gap-3 rounded-[1.25rem] border border-default/70 bg-elevated/55 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="grid gap-1">
                <h4 class="m-0 text-base font-semibold text-highlighted">
                  {{ provider.name }}
                </h4>
                <p class="m-0 text-xs text-toned">
                  {{
                    getOAuthConfig(provider.id)?.isUsable
                      ? t('providers.state.connected')
                      : t('providers.oauth.description')
                  }}
                </p>
              </div>

              <UBadge
                :color="getOAuthConfig(provider.id)?.isUsable ? 'success' : 'warning'"
                :label="getOAuthConfig(provider.id)?.isUsable ? t('providers.state.connected') : t('providers.state.notConnected')"
                variant="soft"
              />
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <UButton
                class="rounded-full"
                color="primary"
                :disabled="providerSettings.oauthState.value.isActive"
                :label="t('providers.oauth.start')"
                @click="handleStartOAuth(provider.id)"
              />
              <UButton
                v-if="getOAuthConfig(provider.id)"
                class="rounded-full"
                color="neutral"
                :label="getOAuthConfig(provider.id)?.isEnabled ? t('providers.actions.disable') : t('providers.actions.enable')"
                variant="outline"
                @click="handleToggleConfig(getOAuthConfig(provider.id)!)"
              />
            </div>
          </article>

          <UAlert
            v-if="providerSettings.oauthState.value.event"
            color="secondary"
            :description="providerSettings.oauthState.value.message ?? providerSettings.oauthState.value.instructions ?? ''"
            :title="t('providers.oauth.activeTitle')"
            variant="soft"
          />

          <div
            v-if="providerSettings.oauthState.value.url"
            class="rounded-[1.25rem] border border-default/70 bg-elevated/50 p-4 text-sm leading-7 text-toned"
          >
            <div class="grid gap-2">
              <span class="font-medium text-highlighted">
                {{ t('providers.oauth.browserHint') }}
              </span>
              <a
                class="break-all text-primary"
                :href="providerSettings.oauthState.value.url"
                rel="noreferrer"
                target="_blank"
              >
                {{ providerSettings.oauthState.value.url }}
              </a>
            </div>
          </div>

          <div
            v-if="providerSettings.oauthState.value.waitingManualCode"
            class="grid gap-3 rounded-[1.25rem] border border-default/70 bg-elevated/50 p-4"
          >
            <UInput
              v-model="manualCode"
              :placeholder="t('providers.oauth.manualCodePlaceholder')"
            />
            <UButton
              class="rounded-full"
              color="primary"
              :disabled="!manualCode.trim()"
              :label="t('providers.oauth.submitManualCode')"
              @click="handleSubmitManualCode"
            />
          </div>
        </div>
      </UCard>
    </div>

    <UCard
      class="border-default/70 bg-default/92 shadow-sm"
      variant="subtle"
    >
      <template #header>
        <div class="grid gap-2">
          <UBadge
            class="w-fit"
            color="primary"
            :label="t('providers.sections.compatible')"
            variant="soft"
          />
          <h3 class="m-0 text-lg font-semibold text-highlighted">
            {{ t('providers.sections.compatible') }}
          </h3>
        </div>
      </template>

      <div class="grid gap-5">
        <div class="grid gap-3 rounded-[1.25rem] border border-default/70 bg-elevated/55 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <div class="grid gap-2">
            <span class="text-xs font-medium uppercase tracking-[0.18em] text-toned">
              {{ t('providers.compatible.displayName') }}
            </span>
            <UInput v-model="compatibleForm.displayName" />
          </div>
          <div class="grid gap-2">
            <span class="text-xs font-medium uppercase tracking-[0.18em] text-toned">
              {{ t('providers.compatible.baseUrl') }}
            </span>
            <UInput v-model="compatibleForm.baseUrl" />
          </div>
          <div class="grid gap-2">
            <span class="text-xs font-medium uppercase tracking-[0.18em] text-toned">
              {{ t('providers.compatible.apiKey') }}
            </span>
            <UInput
              v-model="compatibleForm.apiKey"
              type="password"
            />
          </div>
          <div class="flex flex-wrap gap-3">
            <UButton
              class="rounded-full"
              color="primary"
              :disabled="providerSettings.isSaving.value || !compatibleForm.displayName.trim() || !compatibleForm.baseUrl.trim()"
              :label="compatibleForm.id ? t('providers.compatible.update') : t('providers.compatible.create')"
              @click="handleSaveCompatibleProvider"
            />
            <UButton
              v-if="compatibleForm.id"
              class="rounded-full"
              color="neutral"
              :label="t('providers.compatible.cancelEdit')"
              variant="outline"
              @click="resetCompatibleForm"
            />
          </div>
        </div>

        <div class="grid gap-4">
          <article
            v-for="config in compatibleConfigs"
            :key="config.id"
            class="grid gap-4 rounded-[1.35rem] border border-default/70 bg-elevated/55 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="grid gap-1">
                <h4 class="m-0 text-base font-semibold text-highlighted">
                  {{ config.displayName }}
                </h4>
                <p class="m-0 text-xs text-toned">
                  {{ config.baseUrl }}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <UBadge
                  :color="config.isUsable ? 'success' : 'warning'"
                  :label="config.isUsable ? t('providers.state.connected') : t('providers.state.notConnected')"
                  variant="soft"
                />
                <UButton
                  color="neutral"
                  :label="t('providers.actions.edit')"
                  size="xs"
                  variant="outline"
                  @click="handleEditCompatibleConfig(config)"
                />
                <UButton
                  color="neutral"
                  :label="config.isEnabled ? t('providers.actions.disable') : t('providers.actions.enable')"
                  size="xs"
                  variant="outline"
                  @click="handleToggleConfig(config)"
                />
                <UButton
                  color="neutral"
                  :label="t('providers.actions.syncModels')"
                  size="xs"
                  variant="outline"
                  @click="handleSyncCompatibleModels(config.id)"
                />
                <UButton
                  color="error"
                  :label="t('providers.actions.delete')"
                  size="xs"
                  variant="ghost"
                  @click="handleDeleteConfig(config.id)"
                />
              </div>
            </div>

            <UAlert
              v-if="config.lastSyncError"
              color="warning"
              :description="config.lastSyncError"
              :title="t('providers.compatible.syncError')"
              variant="soft"
            />

            <div class="grid gap-3">
              <div class="flex items-center justify-between gap-3">
                <h5 class="m-0 text-sm font-semibold text-highlighted">
                  {{ t('providers.compatible.models') }}
                </h5>
                <span class="text-xs text-toned">
                  {{ t('providers.compatible.modelCount', { count: config.models.length }) }}
                </span>
              </div>

              <div
                v-if="config.models.length === 0"
                class="rounded-[1.15rem] border border-dashed border-default/70 bg-default/70 p-4 text-sm leading-7 text-toned"
              >
                {{ t('providers.compatible.emptyModels') }}
              </div>

              <div
                v-else
                class="grid gap-2"
              >
                <div
                  v-for="model in config.models"
                  :key="model.id"
                  class="flex flex-wrap items-center justify-between gap-3 rounded-[1.1rem] border border-default/70 bg-default/78 px-3 py-2"
                >
                  <div class="grid gap-1">
                    <span class="text-sm font-medium text-highlighted">
                      {{ model.name }}
                    </span>
                    <span class="text-xs text-toned">
                      {{ model.id }}
                    </span>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge
                      color="neutral"
                      :label="model.origin"
                      variant="soft"
                    />
                    <UButton
                      color="error"
                      :label="t('providers.actions.delete')"
                      size="xs"
                      variant="ghost"
                      @click="handleDeleteManualModel(config.id, model.id)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="grid gap-3 rounded-[1.2rem] border border-default/70 bg-default/78 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_8rem_auto] lg:items-end">
              <div class="grid gap-2">
                <span class="text-xs font-medium uppercase tracking-[0.18em] text-toned">
                  {{ t('providers.compatible.manualModelId') }}
                </span>
                <UInput v-model="getManualModelForm(config.id).modelId" />
              </div>
              <div class="grid gap-2">
                <span class="text-xs font-medium uppercase tracking-[0.18em] text-toned">
                  {{ t('providers.compatible.manualModelName') }}
                </span>
                <UInput v-model="getManualModelForm(config.id).name" />
              </div>
              <div class="grid gap-2">
                <span class="text-xs font-medium uppercase tracking-[0.18em] text-toned">
                  {{ t('providers.compatible.contextWindow') }}
                </span>
                <UInput
                  v-model.number="getManualModelForm(config.id).contextWindow"
                  type="number"
                />
              </div>
              <div class="grid gap-2">
                <span class="text-xs font-medium uppercase tracking-[0.18em] text-toned">
                  {{ t('providers.compatible.maxTokens') }}
                </span>
                <UInput
                  v-model.number="getManualModelForm(config.id).maxTokens"
                  type="number"
                />
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <label class="flex items-center gap-2 text-sm text-toned">
                  <input
                    v-model="getManualModelForm(config.id).reasoning"
                    type="checkbox"
                  >
                  {{ t('providers.compatible.reasoning') }}
                </label>
                <label class="flex items-center gap-2 text-sm text-toned">
                  <input
                    v-model="getManualModelForm(config.id).supportsImageInput"
                    type="checkbox"
                  >
                  {{ t('providers.compatible.imageInput') }}
                </label>
                <UButton
                  class="rounded-full"
                  color="primary"
                  :disabled="!getManualModelForm(config.id).modelId.trim()"
                  :label="t('providers.compatible.saveModel')"
                  @click="handleSaveManualModel(config.id)"
                />
              </div>
            </div>
          </article>
        </div>
      </div>
    </UCard>
  </section>
</template>
