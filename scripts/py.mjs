#!/usr/bin/env node
// Runs Python for the npm scripts without needing an activated virtualenv.
//
//   node scripts/py.mjs -m pytest backend/tests
//   node scripts/py.mjs --ensure-venv -m pip install -r backend/requirements.txt
//
// Python is looked up in this order: $LEMMY_PYTHON, backend/.venv (Unix or Windows
// layout), then python3 / python on PATH. --ensure-venv first creates backend/.venv
// with the system Python when it doesn't exist yet.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const venv = join(root, 'backend', '.venv')
const isWindows = process.platform === 'win32'
const venvPython = isWindows ? join(venv, 'Scripts', 'python.exe') : join(venv, 'bin', 'python')

const works = (cmd) => spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0

function systemPython() {
  return (isWindows ? ['py', 'python', 'python3'] : ['python3', 'python']).find(works) ?? null
}

function fail(message) {
  console.error(`py.mjs: ${message}`)
  process.exit(1)
}

let args = process.argv.slice(2)

if (args[0] === '--ensure-venv') {
  args = args.slice(1)
  if (!existsSync(venvPython)) {
    const python = systemPython() ?? fail('Python 3.12+ was not found on PATH. Install it, or set LEMMY_PYTHON.')
    console.log(`Creating backend/.venv with ${python}...`)
    const created = spawnSync(python, ['-m', 'venv', venv], { stdio: 'inherit' })
    if (created.status !== 0) fail('could not create backend/.venv.')
  }
  if (args.length === 0) process.exit(0)
}

const python =
  process.env.LEMMY_PYTHON || (existsSync(venvPython) ? venvPython : systemPython()) ||
  fail('Python 3.12+ was not found. Run `npm run setup`, or set LEMMY_PYTHON to a Python executable.')

const child = spawn(python, args, { stdio: 'inherit' })
// Forward stop signals, so `concurrently` and Ctrl+C don't leave uvicorn running.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => child.kill(signal))
}
child.on('error', (err) => fail(`could not start ${python}: ${err.message}`))
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
