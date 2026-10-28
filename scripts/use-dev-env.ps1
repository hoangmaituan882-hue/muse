$taskRoot = Split-Path -Parent $PSScriptRoot
$taskLocal = Join-Path $taskRoot '.local'
$taskTools = Join-Path $taskLocal 'tools'
$taskNode = Join-Path $taskTools 'node'
if (-not (Test-Path -LiteralPath (Join-Path $taskNode 'node.exe'))) {
    throw 'Project-local Node.js is missing. Install Node.js 24.22.1 on this drive and place it in .local/tools/node.'
}
$env:VP_HOME = Join-Path $taskTools 'vite-plus'
$env:VP_NODE_MANAGER = 'system'
$env:PNPM_HOME = Join-Path $taskTools 'pnpm'
$env:PATH = "$taskNode;$env:PNPM_HOME;$(Join-Path $env:VP_HOME 'bin');$taskRoot\node_modules\.bin;$env:PATH"
$env:TEMP = Join-Path $taskLocal 'temp'
$env:TMP = $env:TEMP
$env:NPM_CONFIG_CACHE = Join-Path $taskLocal 'cache/npm'
$env:NPM_CONFIG_STORE_DIR = Join-Path ([IO.Path]::GetPathRoot($taskRoot)) '.pnpm-store'
$env:ELECTRON_CACHE = Join-Path $taskLocal 'cache/electron'
$env:ELECTRON_BUILDER_CACHE = Join-Path $taskLocal 'cache/electron-builder'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $taskLocal 'cache/playwright'
$env:__UNSAFE_EXPO_HOME_DIRECTORY = Join-Path $taskLocal 'cache/expo'
$env:EXPO_NO_TELEMETRY = '1'
$env:MUSE_DATA_DIR = Join-Path $taskLocal 'data/development'
$env:MUSE_ELECTRON_PATH = Join-Path $taskTools 'electron/electron.exe'
$env:APPDATA = Join-Path $taskLocal 'appdata'
$env:LOCALAPPDATA = Join-Path $taskLocal 'localappdata'
@($env:TEMP, $env:NPM_CONFIG_CACHE, $env:ELECTRON_CACHE, $env:ELECTRON_BUILDER_CACHE,
  $env:PLAYWRIGHT_BROWSERS_PATH, $env:MUSE_DATA_DIR, $env:APPDATA, $env:LOCALAPPDATA) |
    ForEach-Object { New-Item -ItemType Directory -Path $_ -Force | Out-Null }
