import {
  getAuthBootstrapState,
  loginLocalUser,
  logoutLocalUser,
  registerLocalUser,
} from '#main/services/auth'
import { authBootstrapStates, databaseInitStatuses } from '#shared/auth/types'
import { os } from '@orpc/server'
import { z } from 'zod'

const bootstrapStateSchema = z.object({
  authState: z.enum(authBootstrapStates),
  currentUsername: z.string().nullable(),
  databaseInitError: z.string().nullable(),
  databaseInitStatus: z.enum(databaseInitStatuses),
  hasUser: z.boolean(),
  isAuthenticated: z.boolean(),
})

const authCredentialsInputSchema = z.object({
  password: z.string().min(1),
  username: z.string().trim().min(1),
})

export const authRouter = {
  getBootstrapState: os.output(bootstrapStateSchema).handler(() => getAuthBootstrapState()),
  login: os.input(authCredentialsInputSchema).output(bootstrapStateSchema).handler(async ({ input }) => loginLocalUser(input)),
  logout: os.output(bootstrapStateSchema).handler(() => logoutLocalUser()),
  register: os.input(authCredentialsInputSchema).output(bootstrapStateSchema).handler(async ({ input }) => registerLocalUser(input)),
}
