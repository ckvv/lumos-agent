import {
  deleteManagedMcpServer,
  getManagedMcpServerDetail,
  inspectManagedMcpServer,
  listManagedMcpServers,
  saveManagedMcpServer,
  setManagedMcpServerEnabled,
} from '#main/services/agent/mcp'
import {
  deleteManagedSkill,
  getManagedSkillDetail,
  listManagedSkills,
  setManagedSkillEnabled,
} from '#main/services/agent/skills'
import { mcpTransportKinds } from '#shared/agent/types'
import { os } from '@orpc/server'
import { z } from 'zod'

const jsonObjectSchema = z.record(z.string(), z.unknown())

const mcpToolSummarySchema = z.object({
  description: z.string(),
  inputSchema: jsonObjectSchema.nullable(),
  name: z.string(),
})

const mcpPromptArgumentSummarySchema = z.object({
  description: z.string().nullable(),
  name: z.string(),
  required: z.boolean(),
})

const mcpPromptSummarySchema = z.object({
  arguments: z.array(mcpPromptArgumentSummarySchema),
  description: z.string(),
  name: z.string(),
})

const mcpResourceSummarySchema = z.object({
  description: z.string().nullable(),
  mimeType: z.string().nullable(),
  name: z.string(),
  uri: z.string(),
})

const mcpInspectionSnapshotSchema = z.object({
  capabilities: jsonObjectSchema.nullable(),
  checkedAt: z.string(),
  prompts: z.array(mcpPromptSummarySchema),
  resources: z.array(mcpResourceSummarySchema),
  serverName: z.string().nullable(),
  serverVersion: z.string().nullable(),
  tools: z.array(mcpToolSummarySchema),
})

const mcpServerSummarySchema = z.object({
  displayName: z.string(),
  id: z.number().int(),
  isEnabled: z.boolean(),
  isReachable: z.boolean(),
  lastCheckedAt: z.string().nullable(),
  lastError: z.string().nullable(),
  serverName: z.string().nullable(),
  serverVersion: z.string().nullable(),
  transport: z.enum(mcpTransportKinds),
})

const mcpServerDetailSchema = mcpServerSummarySchema.extend({
  args: z.array(z.string()),
  command: z.string().nullable(),
  createdAt: z.string(),
  cwd: z.string().nullable(),
  envKeys: z.array(z.string()),
  headerKeys: z.array(z.string()),
  inspectResult: mcpInspectionSnapshotSchema.nullable(),
  updatedAt: z.string(),
  url: z.string().nullable(),
})

const saveMcpServerInputSchema = z.discriminatedUnion('transport', [
  z.object({
    args: z.array(z.string()).optional(),
    command: z.string().trim().min(1),
    cwd: z.string().trim().min(1).nullable().optional(),
    displayName: z.string().trim().min(1),
    env: z.record(z.string(), z.string()).optional(),
    id: z.number().int().optional(),
    transport: z.literal('stdio'),
  }),
  z.object({
    displayName: z.string().trim().min(1),
    headers: z.record(z.string(), z.string()).optional(),
    id: z.number().int().optional(),
    transport: z.literal('streamableHttp'),
    url: z.string().url(),
  }),
])

const skillDiagnosticSummarySchema = z.object({
  message: z.string(),
  path: z.string(),
  type: z.string(),
})

const skillSummarySchema = z.object({
  description: z.string(),
  diagnostics: z.array(skillDiagnosticSummarySchema),
  disableModelInvocation: z.boolean(),
  filePath: z.string(),
  hasWarnings: z.boolean(),
  id: z.string(),
  isEnabled: z.boolean(),
  name: z.string(),
  relativePath: z.string(),
})

const skillDetailSchema = skillSummarySchema.extend({
  frontmatter: jsonObjectSchema,
  rawContent: z.string(),
  rootPath: z.string(),
  source: z.string(),
})

const skillListResultSchema = z.object({
  rootPath: z.string(),
  skills: z.array(skillSummarySchema),
})

const numericIdInputSchema = z.object({
  id: z.number().int(),
})

const skillIdInputSchema = z.object({
  id: z.string().min(1),
})

const okSchema = z.object({
  ok: z.literal(true),
})

export const agentRouter = {
  mcp: {
    delete: os.input(numericIdInputSchema).output(okSchema).handler(async ({ input }) => {
      await deleteManagedMcpServer(input.id)
      return { ok: true as const }
    }),
    getDetail: os.input(numericIdInputSchema).output(mcpServerDetailSchema).handler(({ input }) =>
      getManagedMcpServerDetail(input.id),
    ),
    inspect: os.input(numericIdInputSchema).output(mcpServerDetailSchema).handler(({ input }) =>
      inspectManagedMcpServer(input.id),
    ),
    list: os.output(z.array(mcpServerSummarySchema)).handler(() =>
      listManagedMcpServers(),
    ),
    save: os.input(saveMcpServerInputSchema).output(mcpServerDetailSchema).handler(({ input }) =>
      saveManagedMcpServer(input),
    ),
    setEnabled: os.input(z.object({
      id: z.number().int(),
      isEnabled: z.boolean(),
    })).output(mcpServerDetailSchema).handler(({ input }) =>
      setManagedMcpServerEnabled(input.id, input.isEnabled),
    ),
  },
  skills: {
    delete: os.input(skillIdInputSchema).output(okSchema).handler(({ input }) => {
      deleteManagedSkill(input.id)
      return { ok: true as const }
    }),
    getDetail: os.input(skillIdInputSchema).output(skillDetailSchema).handler(({ input }) =>
      getManagedSkillDetail(input.id),
    ),
    list: os.output(skillListResultSchema).handler(() =>
      listManagedSkills(),
    ),
    setEnabled: os.input(z.object({
      id: z.string().min(1),
      isEnabled: z.boolean(),
    })).output(skillDetailSchema).handler(({ input }) =>
      setManagedSkillEnabled(input.id, input.isEnabled),
    ),
  },
}
