param([switch]$WithMobile)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
function Open-Service([string]$title,[string]$command){
  $escapedRoot=$root.Replace("'","''")
  $script="`$host.UI.RawUI.WindowTitle='$title'; Set-Location -LiteralPath '$escapedRoot'; $command"
  Start-Process powershell.exe -ArgumentList @('-NoExit','-NoProfile','-ExecutionPolicy','Bypass','-Command',$script) -UseNewEnvironment
}
Open-Service 'InstaFrame API' 'npm.cmd run dev -w @instaframe/api'
Open-Service 'InstaFrame Web' 'npm.cmd run dev -w @instaframe/web -- --host 0.0.0.0'
if($WithMobile){Open-Service 'InstaFrame Mobile' 'npm.cmd exec -w @instaframe/mobile -- expo start --dev-client --clear'}
Write-Host 'Started InstaFrame services in separate windows.'
Write-Host 'API: http://localhost:4000/health'
Write-Host 'Web: http://localhost:5173'
