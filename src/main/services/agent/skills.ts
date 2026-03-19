import type { ManagedSkillRecord } from '#main/database/schema'
import type { SkillDetail, SkillListResult, SkillSummary } from '#shared/agent/types'
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { db } from '#main/database/database'
import { managedSkills } from '#main/database/schema'
import { logger } from '#main/logger'
import { requireAuthenticatedUser } from '#main/services/auth'
import { ORPCError } from '@orpc/server'
import { and, eq } from 'drizzle-orm'
import { app } from 'electron'

type PiCodingAgentModule = Pick<
  typeof import('@mariozechner/pi-coding-agent'),
  'loadSkillsFromDir' | 'parseFrontmatter'
>

interface SkillCandidate {
  diagnostics: SkillSummary['diagnostics']
  disableModelInvocation: boolean
  filePath: string
  frontmatter: Record<string, unknown>
  id: string
  name: string
  rawContent: string
  relativePath: string
  source: string
  summaryDescription: string
}

let activeSkillRegistry: SkillDetail[] = []
let piCodingAgentModulePromise: Promise<PiCodingAgentModule> | null = null

function getPiCodingAgentModule() {
  // 依赖只暴露 ESM 入口，主进程又保持 CJS bundle，这里交给 Node 运行时做互操作。
  piCodingAgentModulePromise ??= import('@mariozechner/pi-coding-agent')
  return piCodingAgentModulePromise
}

function ensureAgentAccess() {
  requireAuthenticatedUser()
}

function getManagedAgentProjectPath() {
  return path.join(app.getPath('userData'), 'agent-project')
}

export function getManagedSkillsRootPath() {
  return path.join(getManagedAgentProjectPath(), '.pi', 'skills')
}

function ensureManagedSkillsRootPath() {
  const rootPath = getManagedSkillsRootPath()
  mkdirSync(rootPath, { recursive: true })
  return rootPath
}

function toPosixRelativePath(rootPath: string, targetPath: string) {
  return path.relative(rootPath, targetPath).split(path.sep).join('/')
}

function ensurePathInsideRoot(targetPath: string, rootPath: string) {
  const resolvedRootPath = path.resolve(rootPath)
  const resolvedTargetPath = path.resolve(targetPath)

  if (resolvedTargetPath === resolvedRootPath)
    return

  if (!resolvedTargetPath.startsWith(`${resolvedRootPath}${path.sep}`)) {
    throw new ORPCError('FORBIDDEN', {
      message: 'Skill path is outside the managed workspace',
    })
  }
}

function collectSkillFiles(rootPath: string, directoryPath = rootPath, includeRootFiles = true, acc: string[] = []) {
  const entries = readdirSync(directoryPath, { withFileTypes: true })
  const skillRootFile = entries.find(entry => entry.name === 'SKILL.md' && entry.isFile())

  if (skillRootFile) {
    acc.push(path.join(directoryPath, skillRootFile.name))
    return acc
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules')
      continue

    const entryPath = path.join(directoryPath, entry.name)

    if (entry.isDirectory()) {
      collectSkillFiles(rootPath, entryPath, false, acc)
      continue
    }

    if (includeRootFiles && entry.isFile() && entry.name.endsWith('.md'))
      acc.push(entryPath)
  }

  return acc
}

function getManagedSkillRecords() {
  return db.select().from(managedSkills).all()
}

async function readSkillCandidate(filePath: string, rootPath: string): Promise<SkillCandidate> {
  const { loadSkillsFromDir, parseFrontmatter } = await getPiCodingAgentModule()
  const relativePath = toPosixRelativePath(rootPath, filePath)
  const diagnosticsResult = loadSkillsFromDir({
    dir: path.dirname(filePath),
    source: 'managed',
  })
  const relatedDiagnostics = diagnosticsResult.diagnostics
    .filter(diagnostic => diagnostic.path === filePath)
    .map(diagnostic => ({
      message: diagnostic.message,
      path: diagnostic.path ?? filePath,
      type: diagnostic.type,
    }))

  let rawContent = ''
  let frontmatter: Record<string, unknown> = {}

  try {
    rawContent = readFileSync(filePath, 'utf-8')
    frontmatter = parseFrontmatter(rawContent).frontmatter
  }
  catch (error) {
    relatedDiagnostics.push({
      message: error instanceof Error ? error.message : 'Failed to read skill file',
      path: filePath,
      type: 'warning',
    })
  }

  const fallbackName = path.basename(filePath) === 'SKILL.md'
    ? path.basename(path.dirname(filePath))
    : path.basename(filePath, path.extname(filePath))

  const loadedSkill = diagnosticsResult.skills.find(skill => skill.filePath === filePath) ?? null
  const frontmatterName = typeof frontmatter.name === 'string' ? frontmatter.name.trim() : ''
  const frontmatterDescription = typeof frontmatter.description === 'string' ? frontmatter.description.trim() : ''
  const disableModelInvocation = loadedSkill?.disableModelInvocation
    ?? frontmatter['disable-model-invocation'] === true

  if (!frontmatterDescription && !loadedSkill) {
    relatedDiagnostics.push({
      message: 'description is required',
      path: filePath,
      type: 'warning',
    })
  }

  return {
    diagnostics: relatedDiagnostics,
    disableModelInvocation,
    filePath,
    frontmatter,
    id: relativePath,
    name: loadedSkill?.name || frontmatterName || fallbackName,
    rawContent,
    relativePath,
    source: loadedSkill?.source ?? 'managed',
    summaryDescription: loadedSkill?.description ?? frontmatterDescription,
  }
}

function mapSkillSummary(candidate: SkillCandidate, enabledRecord: ManagedSkillRecord | null): SkillSummary {
  return {
    description: candidate.summaryDescription,
    diagnostics: candidate.diagnostics,
    disableModelInvocation: candidate.disableModelInvocation,
    filePath: candidate.filePath,
    hasWarnings: candidate.diagnostics.length > 0,
    id: candidate.id,
    isEnabled: enabledRecord?.isEnabled ?? false,
    name: candidate.name,
    relativePath: candidate.relativePath,
  }
}

async function listSkillCandidates() {
  ensureAgentAccess()

  const rootPath = ensureManagedSkillsRootPath()
  const files = collectSkillFiles(rootPath)
  const records = getManagedSkillRecords()
  const recordMap = new Map(records.map(record => [record.id, record]))
  const candidates = await Promise.all(files.map(filePath => readSkillCandidate(filePath, rootPath)))

  return {
    candidates,
    recordMap,
    rootPath,
  }
}

function mapSkillDetail(candidate: SkillCandidate, enabledRecord: ManagedSkillRecord | null, rootPath: string): SkillDetail {
  return {
    ...mapSkillSummary(candidate, enabledRecord),
    frontmatter: candidate.frontmatter,
    rawContent: candidate.rawContent,
    rootPath,
    source: candidate.source,
  }
}

function upsertSkillRecord(payload: {
  filePath: string
  id: string
  isEnabled: boolean
  skillName: string
}) {
  const now = new Date().toISOString()

  db.insert(managedSkills)
    .values({
      createdAt: now,
      filePath: payload.filePath,
      id: payload.id,
      isEnabled: payload.isEnabled,
      skillName: payload.skillName,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      set: {
        filePath: payload.filePath,
        isEnabled: payload.isEnabled,
        skillName: payload.skillName,
        updatedAt: now,
      },
      target: managedSkills.id,
    })
    .run()
}

async function rebuildActiveSkillRegistry() {
  const details = await Promise.all(
    (await listManagedSkills()).skills
      .filter(skill => skill.isEnabled)
      .map(skill => getManagedSkillDetail(skill.id)),
  )

  activeSkillRegistry = details
  return activeSkillRegistry
}

export async function listManagedSkills(): Promise<SkillListResult> {
  const { candidates, recordMap, rootPath } = await listSkillCandidates()

  const summaries = candidates.map(candidate =>
    mapSkillSummary(candidate, recordMap.get(candidate.id) ?? null),
  )

  for (const record of recordMap.values()) {
    if (summaries.some(skill => skill.id === record.id))
      continue

    summaries.push({
      description: '',
      diagnostics: [{
        message: 'skill file no longer exists',
        path: record.filePath,
        type: 'warning',
      }],
      disableModelInvocation: false,
      filePath: record.filePath,
      hasWarnings: true,
      id: record.id,
      isEnabled: record.isEnabled,
      name: record.skillName,
      relativePath: record.id,
    })
  }

  return {
    rootPath,
    skills: summaries.sort((left, right) => left.name.localeCompare(right.name)),
  }
}

export async function getManagedSkillDetail(id: string): Promise<SkillDetail> {
  ensureAgentAccess()

  const { candidates, recordMap, rootPath } = await listSkillCandidates()
  const candidate = candidates.find(item => item.id === id)

  if (!candidate) {
    const record = recordMap.get(id)

    if (record) {
      return {
        description: '',
        diagnostics: [{
          message: 'skill file no longer exists',
          path: record.filePath,
          type: 'warning',
        }],
        disableModelInvocation: false,
        filePath: record.filePath,
        frontmatter: {},
        hasWarnings: true,
        id: record.id,
        isEnabled: record.isEnabled,
        name: record.skillName,
        rawContent: '',
        relativePath: record.id,
        rootPath,
        source: 'managed',
      }
    }

    throw new ORPCError('NOT_FOUND', {
      message: 'Skill was not found',
    })
  }

  return mapSkillDetail(candidate, recordMap.get(candidate.id) ?? null, rootPath)
}

export async function setManagedSkillEnabled(id: string, isEnabled: boolean) {
  const detail = await getManagedSkillDetail(id)
  const detailStats = statSafe(detail.filePath)

  if (!detail.filePath || (detail.hasWarnings && !detailStats)) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Skill file is not available',
    })
  }

  upsertSkillRecord({
    filePath: detail.filePath,
    id: detail.id,
    isEnabled,
    skillName: detail.name,
  })

  return (await rebuildActiveSkillRegistry()).find(skill => skill.id === detail.id) ?? {
    ...detail,
    isEnabled,
  }
}

function statSafe(filePath: string) {
  try {
    return statSync(filePath)
  }
  catch {
    return null
  }
}

export async function deleteManagedSkill(id: string) {
  const detail = await getManagedSkillDetail(id)
  const rootPath = ensureManagedSkillsRootPath()

  ensurePathInsideRoot(detail.filePath, rootPath)

  const targetPath = path.basename(detail.filePath) === 'SKILL.md'
    ? path.dirname(detail.filePath)
    : detail.filePath

  ensurePathInsideRoot(targetPath, rootPath)
  const targetStats = statSafe(targetPath)

  if (targetStats)
    rmSync(targetPath, { force: false, recursive: true })

  db.delete(managedSkills)
    .where(and(
      eq(managedSkills.id, detail.id),
      eq(managedSkills.filePath, detail.filePath),
    ))
    .run()

  await rebuildActiveSkillRegistry()
  logger.info({ skillId: detail.id, targetPath }, 'Managed skill deleted')
}

export async function getActiveSkillRegistry() {
  return rebuildActiveSkillRegistry()
}
