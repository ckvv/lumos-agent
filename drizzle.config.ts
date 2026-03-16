import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  breakpoints: true,
  dialect: 'sqlite',
  out: './drizzle',
  schema: './src/main/database/schema.ts',
})
