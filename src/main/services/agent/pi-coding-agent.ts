export type PiCodingAgentModule = Pick<
  typeof import('@mariozechner/pi-coding-agent'),
  'AuthStorage'
  | 'createBashTool'
  | 'createAgentSession'
  | 'createEditTool'
  | 'createFindTool'
  | 'createGrepTool'
  | 'createLsTool'
  | 'createReadTool'
  | 'createWriteTool'
  | 'DefaultResourceLoader'
  | 'loadSkillsFromDir'
  | 'parseFrontmatter'
  | 'SessionManager'
  | 'SettingsManager'
>

let piCodingAgentModulePromise: Promise<PiCodingAgentModule> | null = null

export function getPiCodingAgentModule() {
  // 依赖只暴露 ESM 入口，主进程又保持 CJS bundle，这里交给 Node 运行时做互操作。
  piCodingAgentModulePromise ??= import('@mariozechner/pi-coding-agent')
  return piCodingAgentModulePromise
}
