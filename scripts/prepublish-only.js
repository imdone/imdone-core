import { spawn } from 'node:child_process'

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

function isTruthy(value) {
  return TRUE_VALUES.has(String(value || '').toLowerCase())
}

function shouldSkipPrepublishOnly() {
  return isTruthy(process.env.NO_PREPUBLISH)
}

if (shouldSkipPrepublishOnly()) {
  console.log('Skipping prepublishOnly because skip prepublish override is enabled.')
  process.exit(0)
}

const build = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

build.on('exit', (code) => {
  process.exit(code ?? 1)
})

build.on('error', (error) => {
  console.error(`Unable to run prepublishOnly build: ${error.message}`)
  process.exit(1)
})
