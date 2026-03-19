import type { BuiltinToolListSnapshot, BuiltinToolSummarySnapshot } from '#renderer/orpc/client'
import { getORPCErrorMessage, runWithORPCClient } from '#renderer/composables/useORPCRequest'
import { computed, shallowReadonly, shallowRef } from 'vue'

const builtinToolList = shallowRef<BuiltinToolListSnapshot | null>(null)
const errorMessage = shallowRef<string | null>(null)
const actionErrorMessage = shallowRef<string | null>(null)
const isLoading = shallowRef(false)
const isSaving = shallowRef(false)

function replaceBuiltinToolSummary(detail: BuiltinToolSummarySnapshot) {
  if (!builtinToolList.value)
    return

  const nextTools = [...builtinToolList.value.tools]
  const currentIndex = nextTools.findIndex(tool => tool.name === detail.name)

  if (currentIndex === -1)
    nextTools.push(detail)
  else
    nextTools[currentIndex] = detail

  builtinToolList.value = {
    ...builtinToolList.value,
    tools: nextTools,
  }
}

export function useBuiltinToolSettings() {
  async function load() {
    isLoading.value = true
    errorMessage.value = null

    try {
      builtinToolList.value = await runWithORPCClient(client => client.agent.tools.list())
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

  async function setEnabled(name: BuiltinToolSummarySnapshot['name'], isEnabled: boolean) {
    return runMutation(async () => {
      const detail = await runWithORPCClient(client => client.agent.tools.setEnabled({
        isEnabled,
        name,
      }))
      replaceBuiltinToolSummary(detail)
      return detail
    })
  }

  return {
    actionErrorMessage: shallowReadonly(actionErrorMessage),
    enabledTools: computed(() =>
      builtinToolList.value?.tools.filter(tool => tool.isEnabled) ?? [],
    ),
    errorMessage: shallowReadonly(errorMessage),
    isLoading: shallowReadonly(isLoading),
    isSaving: shallowReadonly(isSaving),
    load,
    setEnabled,
    tools: computed(() => builtinToolList.value?.tools ?? []),
    workspaceRoot: computed(() => builtinToolList.value?.workspaceRoot ?? ''),
  }
}
