import type { McpServerDetailSnapshot, McpServerSummarySnapshot } from '#renderer/orpc/client'
import type { SaveMcpServerInput } from '#shared/agent/types'
import { getORPCErrorMessage, runWithORPCClient } from '#renderer/composables/useORPCRequest'
import { computed, shallowReadonly, shallowRef } from 'vue'

const servers = shallowRef<McpServerSummarySnapshot[]>([])
const selectedServerDetail = shallowRef<McpServerDetailSnapshot | null>(null)
const errorMessage = shallowRef<string | null>(null)
const actionErrorMessage = shallowRef<string | null>(null)
const isLoading = shallowRef(false)
const isSaving = shallowRef(false)

function syncSelectedSummary(detail: McpServerDetailSnapshot) {
  const nextSummary: McpServerSummarySnapshot = {
    displayName: detail.displayName,
    id: detail.id,
    isEnabled: detail.isEnabled,
    isReachable: detail.isReachable,
    lastCheckedAt: detail.lastCheckedAt,
    lastError: detail.lastError,
    serverName: detail.serverName,
    serverVersion: detail.serverVersion,
    transport: detail.transport,
  }

  const nextServers = [...servers.value]
  const currentIndex = nextServers.findIndex(server => server.id === detail.id)

  if (currentIndex === -1)
    nextServers.push(nextSummary)
  else
    nextServers[currentIndex] = nextSummary

  servers.value = nextServers.sort((left, right) => left.displayName.localeCompare(right.displayName))
}

export function useMcpSettings() {
  async function load() {
    isLoading.value = true
    errorMessage.value = null

    try {
      servers.value = await runWithORPCClient(client => client.agent.mcp.list())

      if (selectedServerDetail.value) {
        const matchingServer = servers.value.find(server => server.id === selectedServerDetail.value?.id)

        if (!matchingServer)
          selectedServerDetail.value = null
      }
    }
    catch (error) {
      errorMessage.value = getORPCErrorMessage(error)
      throw error
    }
    finally {
      isLoading.value = false
    }
  }

  async function runMutation<T>(handler: () => Promise<T>) {
    isSaving.value = true
    actionErrorMessage.value = null

    try {
      return await handler()
    }
    catch (error) {
      actionErrorMessage.value = getORPCErrorMessage(error)
      throw error
    }
    finally {
      isSaving.value = false
    }
  }

  async function selectServer(id: number) {
    const detail = await runWithORPCClient(client => client.agent.mcp.getDetail({ id }))
    selectedServerDetail.value = detail
    syncSelectedSummary(detail)
    return detail
  }

  async function inspectServer(id: number) {
    return runMutation(async () => {
      const detail = await runWithORPCClient(client => client.agent.mcp.inspect({ id }))
      selectedServerDetail.value = detail
      syncSelectedSummary(detail)
      return detail
    })
  }

  async function saveServer(payload: SaveMcpServerInput) {
    return runMutation(async () => {
      const detail = await runWithORPCClient(client => client.agent.mcp.save(payload))
      selectedServerDetail.value = detail
      syncSelectedSummary(detail)
      await load()
      return detail
    })
  }

  async function setEnabled(id: number, isEnabled: boolean) {
    return runMutation(async () => {
      const detail = await runWithORPCClient(client => client.agent.mcp.setEnabled({
        id,
        isEnabled,
      }))
      selectedServerDetail.value = detail
      syncSelectedSummary(detail)
      await load()
      return detail
    })
  }

  async function deleteServer(id: number) {
    return runMutation(async () => {
      await runWithORPCClient(client => client.agent.mcp.delete({ id }))

      if (selectedServerDetail.value?.id === id)
        selectedServerDetail.value = null

      await load()
    })
  }

  return {
    actionErrorMessage: shallowReadonly(actionErrorMessage),
    deleteServer,
    errorMessage: shallowReadonly(errorMessage),
    inspectServer,
    isLoading: shallowReadonly(isLoading),
    isSaving: shallowReadonly(isSaving),
    load,
    saveServer,
    selectedServerDetail: shallowReadonly(selectedServerDetail),
    selectServer,
    servers: shallowReadonly(servers),
    setEnabled,
    usableServerCount: computed(() => servers.value.filter(server => server.isEnabled).length),
  }
}
