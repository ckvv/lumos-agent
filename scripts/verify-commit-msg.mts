import { readFileSync } from 'node:fs'
import process from 'node:process'
import { styleText } from 'node:util'

// https://github.com/vuejs/vue/blob/main/scripts/verify-commit-msg.js

const msgPath = process.argv[2]

const msg = readFileSync(msgPath!, 'utf-8').trim()

const commitRE
  // eslint-disable-next-line regexp/no-unused-capturing-group
  = /^(revert: )?(wip|release|feat|fix|polish|docs|style|refactor|perf|test|workflow|ci|chore|types|build)(\(.+\))?: .{1,50}/

if (!commitRE.test(msg)) {
  console.log(msg)
  console.error(
    `  ${styleText(['bgRed', 'white'], ' ERROR ')} ${styleText('red', `invalid commit message format.`)}\n\n${
      styleText('red', `  Proper commit message format is required for automated changelog generation. Examples:\n\n`)
    }    ${styleText('green', `feat(compiler): add 'comments' option`)}\n`
    + `    ${styleText('green', `fix(v-model): handle events on blur (close #28)`)}\n\n${
      styleText('red', `  See .github/COMMIT_CONVENTION.md for more details.\n`)}`,
  )
  process.exit(1)
}
