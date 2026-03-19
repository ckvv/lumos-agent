import type { router } from '#main/orpc/router'
import type { RouterClient } from '@orpc/server'
import { ORPC_CONNECT_MESSAGE_TYPE } from '#shared/orpc/constants'
import { createORPCClient } from '@orpc/client'
import { onMessagePortClose, RPCLink } from '@orpc/client/message-port'

export type Client = RouterClient<typeof router>
export type AppBootstrapSnapshot = Awaited<ReturnType<Client['app']['getBootstrap']>>
export type AppInfo = Awaited<ReturnType<Client['app']['getInfo']>>
export type BuiltinToolListSnapshot = Awaited<ReturnType<Client['agent']['tools']['list']>>
export type BuiltinToolSummarySnapshot = BuiltinToolListSnapshot['tools'][number]
export type McpServerSummarySnapshot = Awaited<ReturnType<Client['agent']['mcp']['list']>>[number]
export type McpServerDetailSnapshot = Awaited<ReturnType<Client['agent']['mcp']['getDetail']>>
export type SkillListSnapshot = Awaited<ReturnType<Client['agent']['skills']['list']>>
export type SkillSummarySnapshot = SkillListSnapshot['skills'][number]
export type SkillDetailSnapshot = Awaited<ReturnType<Client['agent']['skills']['getDetail']>>
export type ConversationDetailSnapshot = Awaited<ReturnType<Client['chat']['conversations']['getDetail']>>
export type ProviderConfigDetailSnapshot = Awaited<ReturnType<Client['chat']['providers']['listConfigs']>>[number]
export type OAuthProviderOptionSnapshot = Awaited<ReturnType<Client['chat']['providers']['listOAuthProviders']>>[number]

const RETRYABLE_ORPC_ERROR_RE = /channel|messageport|message port|transport|closed|disconnected|connection/i

let clientPromise: Promise<Client> | undefined

export function getORPCClient() {
  if (!clientPromise) {
    clientPromise = new Promise<Client>((resolve) => {
      const channel = new MessageChannel()

      channel.port1.start()

      const currentPromise = clientPromise

      onMessagePortClose(channel.port1, () => {
        if (clientPromise === currentPromise)
          clientPromise = undefined
      })

      window.postMessage(
        { type: ORPC_CONNECT_MESSAGE_TYPE },
        '*',
        [channel.port2],
      )

      const client: Client = createORPCClient(new RPCLink({ port: channel.port1 }))
      resolve(client)
    })
  }

  return clientPromise
}

export function resetORPCClient() {
  clientPromise = undefined
}

export function shouldRetryORPCTransport(error: unknown) {
  if (!(error instanceof Error))
    return false

  return RETRYABLE_ORPC_ERROR_RE.test(error.message)
}
