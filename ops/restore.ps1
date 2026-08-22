param(
  [Parameter(Mandatory=$true)][string]$BackupDirectory,
  [Parameter(Mandatory=$true)][ValidateSet('RESTORE_INSTAFRAME')][string]$ConfirmRestore,
  [switch]$RestoreRedis
)
$ErrorActionPreference = 'Stop'
if (-not $env:MONGO_URI) { throw 'MONGO_URI is required' }
$source = [System.IO.Path]::GetFullPath($BackupDirectory)
$manifestPath = Join-Path $source 'manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw 'Backup manifest is missing' }
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
foreach ($file in $manifest.files) {
  $path = Join-Path $source $file.name
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Backup file missing: $($file.name)" }
  $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
  if ($actual -ne $file.sha256) { throw "Checksum mismatch: $($file.name)" }
}
$mongoArchive = Join-Path $source 'mongo.archive.gz'
& mongorestore --uri=$env:MONGO_URI --archive=$mongoArchive --gzip --drop
if ($LASTEXITCODE -ne 0) { throw 'mongorestore failed' }
if ($RestoreRedis) {
  if (-not $env:REDIS_URL) { throw 'REDIS_URL is required for Redis restore' }
  $redisFile = Join-Path $source 'redis.rdb'
  if (-not (Test-Path -LiteralPath $redisFile)) { throw 'redis.rdb is missing' }
  throw 'Managed Redis restore is provider-specific. Upload the verified redis.rdb using the provider recovery console.'
}
Write-Output 'MongoDB restore completed. Run application smoke tests before opening traffic.'
