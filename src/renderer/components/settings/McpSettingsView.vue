<script setup lang="ts">
import type { SaveMcpServerInput } from '#shared/agent/types'
import { useMcpSettings } from '#renderer/composables/useMcpSettings'
import { confirmAction } from '#renderer/utils/confirm'
import { computed, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const mcpSettings = useMcpSettings()

const transportItems = computed(() => [
  {
    label: t('settings.mcp.transports.stdio'),
    value: 'stdio',
  },
  {
    label: t('settings.mcp.transports.streamableHttp'),
    value: 'streamableHttp',
  },
])

const form = reactive({
  args: '',
  command: '',
  cwd: '',
  displayName: '',
  envText: '',
  headersText: '',
  id: undefined as number | undefined,
  transport: 'stdio' as SaveMcpServerInput['transport'],
  url: '',
})

function splitLines(value: string) {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

function parseKeyValueText(value: string) {
  const result: Record<string, string> = {}

  for (const line of splitLines(value)) {
    const separatorIndex = line.includes('=') ? line.indexOf('=') : line.indexOf(':')

    if (separatorIndex === -1)
      continue

    const key = line.slice(0, separatorIndex).trim()
    const rawValue = line.slice(separatorIndex + 1).trim()

    if (key)
      result[key] = rawValue
  }

  return result
}

function resetForm() {
  form.args = ''
  form.command = ''
  form.cwd = ''
  form.displayName = ''
  form.envText = ''
  form.headersText = ''
  form.id = undefined
  form.transport = 'stdio'
  form.url = ''
}

function handleSelectServer(id: number) {
  void mcpSettings.selectServer(id).then((detail) => {
    form.args = detail.args.join('\n')
    form.command = detail.command ?? ''
    form.cwd = detail.cwd ?? ''
    form.displayName = detail.displayName
    form.envText = ''
    form.headersText = ''
    form.id = detail.id
    form.transport = detail.transport
    form.url = detail.url ?? ''
  })
}

async function handleSave() {
  const basePayload = {
    displayName: form.displayName,
    id: form.id,
    transport: form.transport,
  }

  if (form.transport === 'stdio') {
    await mcpSettings.saveServer({
      ...basePayload,
      args: splitLines(form.args),
      command: form.command,
      cwd: form.cwd || null,
      env: form.envText.trim() ? parseKeyValueText(form.envText) : undefined,
      transport: 'stdio',
    })
  }
  else {
    await mcpSettings.saveServer({
      ...basePayload,
      headers: form.headersText.trim() ? parseKeyValueText(form.headersText) : undefined,
      transport: 'streamableHttp',
      url: form.url,
    })
  }

  resetForm()
}

async function handleDelete(id: number) {
  if (!confirmAction(t('settings.mcp.confirmDelete')))
    return

  await mcpSettings.deleteServer(id)
  resetForm()
}

onMounted(async () => {
  await mcpSettings.load()
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
              :label="t('settings.mcp.eyebrow')"
              variant="soft"
            />
            <UBadge
              color="neutral"
              :label="t('settings.mcp.summary.enabled', { count: mcpSettings.usableServerCount.value })"
              variant="soft"
            />
          </div>
          <h2 class="m-0 text-lg font-semibold text-highlighted">
            {{ t('settings.mcp.title') }}
          </h2>
          <p class="m-0 text-sm leading-7 text-toned">
            {{ t('settings.mcp.body') }}
          </p>
        </div>
      </template>

      <div class="grid gap-4">
        <UAlert
          v-if="mcpSettings.errorMessage.value || mcpSettings.actionErrorMessage.value"
          color="error"
          :description="mcpSettings.actionErrorMessage.value ?? mcpSettings.errorMessage.value ?? ''"
          :title="t('settings.errors.title')"
          variant="soft"
        />

        <UFormField :label="t('settings.mcp.form.displayName')">
          <UInput v-model="form.displayName" />
        </UFormField>

        <UFormField :label="t('settings.mcp.form.transport')">
          <USelect
            v-model="form.transport"
            :items="transportItems"
          />
        </UFormField>

        <template v-if="form.transport === 'stdio'">
          <UFormField :label="t('settings.mcp.form.command')">
            <UInput v-model="form.command" />
          </UFormField>

          <UFormField :label="t('settings.mcp.form.args')">
            <UTextarea
              v-model="form.args"
              :rows="4"
            />
          </UFormField>

          <UFormField :label="t('settings.mcp.form.cwd')">
            <UInput v-model="form.cwd" />
          </UFormField>

          <UFormField :label="t('settings.mcp.form.env')">
            <UTextarea
              v-model="form.envText"
              :placeholder="t('settings.mcp.form.envPlaceholder')"
              :rows="4"
            />
          </UFormField>
        </template>

        <template v-else>
          <UFormField :label="t('settings.mcp.form.url')">
            <UInput v-model="form.url" />
          </UFormField>

          <UFormField :label="t('settings.mcp.form.headers')">
            <UTextarea
              v-model="form.headersText"
              :placeholder="t('settings.mcp.form.headersPlaceholder')"
              :rows="4"
            />
          </UFormField>
        </template>

        <div class="flex flex-wrap gap-2">
          <UButton
            :disabled="mcpSettings.isSaving.value"
            :label="form.id ? t('settings.actions.update') : t('settings.actions.create')"
            @click="handleSave"
          />
          <UButton
            color="neutral"
            :label="t('settings.actions.reset')"
            variant="soft"
            @click="resetForm"
          />
        </div>
      </div>
    </UCard>

    <div class="grid gap-4">
      <UCard
        v-for="server in mcpSettings.servers.value"
        :key="server.id"
        class="border-default/70 bg-default/92 shadow-sm"
        variant="subtle"
      >
        <template #header>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="grid gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="m-0 text-base font-semibold text-highlighted">
                  {{ server.displayName }}
                </h3>
                <UBadge
                  :color="server.isEnabled ? 'primary' : 'neutral'"
                  :label="server.isEnabled ? t('settings.states.enabled') : t('settings.states.disabled')"
                  variant="soft"
                />
                <UBadge
                  :color="server.isReachable ? 'success' : 'warning'"
                  :label="server.isReachable ? t('settings.states.connected') : t('settings.states.unavailable')"
                  variant="soft"
                />
              </div>
              <p class="m-0 text-sm text-toned">
                {{ server.transport === 'stdio' ? t('settings.mcp.transports.stdio') : t('settings.mcp.transports.streamableHttp') }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton
                color="neutral"
                :label="t('settings.actions.details')"
                variant="soft"
                @click="handleSelectServer(server.id)"
              />
              <UButton
                color="neutral"
                :label="t('settings.actions.inspect')"
                variant="soft"
                @click="mcpSettings.inspectServer(server.id)"
              />
              <UButton
                :color="server.isEnabled ? 'warning' : 'primary'"
                :label="server.isEnabled ? t('settings.actions.disable') : t('settings.actions.enable')"
                @click="mcpSettings.setEnabled(server.id, !server.isEnabled)"
              />
              <UButton
                color="error"
                :label="t('settings.actions.delete')"
                variant="soft"
                @click="handleDelete(server.id)"
              />
            </div>
          </div>
        </template>

        <div class="grid gap-3">
          <p
            v-if="server.lastError"
            class="m-0 text-sm leading-6 text-error"
          >
            {{ server.lastError }}
          </p>
          <p
            v-else
            class="m-0 text-sm leading-6 text-toned"
          >
            {{ t('settings.mcp.summary.serverInfo', { name: server.serverName ?? '-', version: server.serverVersion ?? '-' }) }}
          </p>
        </div>
      </UCard>

      <UCard
        v-if="mcpSettings.selectedServerDetail.value"
        class="border-default/70 bg-default/92 shadow-sm"
        variant="subtle"
      >
        <template #header>
          <div class="grid gap-1">
            <h3 class="m-0 text-base font-semibold text-highlighted">
              {{ t('settings.mcp.detailTitle', { name: mcpSettings.selectedServerDetail.value.displayName }) }}
            </h3>
            <p class="m-0 text-sm text-toned">
              {{ t('settings.mcp.detailHint') }}
            </p>
          </div>
        </template>

        <div class="grid gap-4">
          <div class="grid gap-2">
            <UBadge
              class="w-fit"
              color="neutral"
              :label="t('settings.mcp.detailTools', { count: mcpSettings.selectedServerDetail.value.inspectResult?.tools.length ?? 0 })"
              variant="soft"
            />
            <pre class="overflow-x-auto rounded-xl border border-default/70 bg-muted/40 p-3 text-xs leading-6 text-toned">{{ JSON.stringify(mcpSettings.selectedServerDetail.value.inspectResult, null, 2) }}</pre>
          </div>
        </div>
      </UCard>
    </div>
  </section>
</template>
