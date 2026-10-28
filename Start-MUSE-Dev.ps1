. (Join-Path $PSScriptRoot 'scripts/use-dev-env.ps1')
Set-Location -LiteralPath $PSScriptRoot
& (Join-Path $env:VP_HOME 'bin/vp.exe') run dev
