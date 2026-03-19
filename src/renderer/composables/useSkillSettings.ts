import type { SkillDetailSnapshot, SkillListSnapshot, SkillSummarySnapshot } from '#renderer/orpc/client'
import { getORPCErrorMessage, runWithORPCClient } from '#renderer/composables/useORPCRequest'
import { computed, shallowReadonly, shallowRef } from 'vue'

const skillList = shallowRef<SkillListSnapshot | null>(null)
const selectedSkillDetail = shallowRef<SkillDetailSnapshot | null>(null)
const errorMessage = shallowRef<string | null>(null)
const actionErrorMessage = shallowRef<string | null>(null)
const isLoading = shallowRef(false)
const isSaving = shallowRef(false)

function replaceSkillSummary(detail: SkillDetailSnapshot) {
  if (!skillList.value)
    return

  const nextSkills = [...skillList.value.skills]
  const currentIndex = nextSkills.findIndex(skill => skill.id === detail.id)
  const nextSummary: SkillSummarySnapshot = {
    description: detail.description,
    diagnostics: detail.diagnostics,
    disableModelInvocation: detail.disableModelInvocation,
    filePath: detail.filePath,
    hasWarnings: detail.hasWarnings,
    id: detail.id,
    isEnabled: detail.isEnabled,
    name: detail.name,
    relativePath: detail.relativePath,
  }

  if (currentIndex === -1)
    nextSkills.push(nextSummary)
  else
    nextSkills[currentIndex] = nextSummary

  skillList.value = {
    ...skillList.value,
    skills: nextSkills.sort((left, right) => left.name.localeCompare(right.name)),
  }
}

export function useSkillSettings() {
  async function load() {
    isLoading.value = true
    errorMessage.value = null

    try {
      skillList.value = await runWithORPCClient(client => client.agent.skills.list())

      if (selectedSkillDetail.value) {
        const matchingSkill = skillList.value.skills.find(skill => skill.id === selectedSkillDetail.value?.id)

        if (!matchingSkill)
          selectedSkillDetail.value = null
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

  async function selectSkill(id: string) {
    const detail = await runWithORPCClient(client => client.agent.skills.getDetail({ id }))
    selectedSkillDetail.value = detail
    replaceSkillSummary(detail)
    return detail
  }

  async function setEnabled(id: string, isEnabled: boolean) {
    return runMutation(async () => {
      const detail = await runWithORPCClient(client => client.agent.skills.setEnabled({
        id,
        isEnabled,
      }))
      selectedSkillDetail.value = detail
      replaceSkillSummary(detail)
      await load()
      return detail
    })
  }

  async function deleteSkill(id: string) {
    return runMutation(async () => {
      await runWithORPCClient(client => client.agent.skills.delete({ id }))

      if (selectedSkillDetail.value?.id === id)
        selectedSkillDetail.value = null

      await load()
    })
  }

  return {
    actionErrorMessage: shallowReadonly(actionErrorMessage),
    activeSkills: computed(() =>
      skillList.value?.skills.filter(skill => skill.isEnabled) ?? [],
    ),
    deleteSkill,
    errorMessage: shallowReadonly(errorMessage),
    isLoading: shallowReadonly(isLoading),
    isSaving: shallowReadonly(isSaving),
    load,
    rootPath: computed(() => skillList.value?.rootPath ?? ''),
    selectedSkillDetail: shallowReadonly(selectedSkillDetail),
    selectSkill,
    setEnabled,
    skills: computed(() => skillList.value?.skills ?? []),
  }
}
