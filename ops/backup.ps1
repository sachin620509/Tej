param(
  [Parameter(Mandatory=$true)][string]$BackupRoot,
  [int]$RetentionDays = 14
)
$ErrorActionPreference = 'Stop'
if (-not $env:MONGO_URI) { throw 'MONGO_URI is required' }
$root = [System.IO.Path]::GetFullPath($BackupRoot)
if ($root -eq [System.IO.Path]::GetPathRoot($root)) { throw 'BackupRoot cannot be a filesystem root' }
New-Item -ItemType Directory -Force -Path $root | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$target = Join-Path $root "instaframe-$stamp"
New-Item -ItemType Directory -Path $target | Out-Null
$mongoArchive = Join-Path $target 'mongo.archive.gz'
& mongodump --uri=$env:MONGO_URI --archive=$mongoArchive --gzip
if ($LASTEXITCODE -ne 0) { throw 'mongodump failed' }
if ($env:REDIS_URL) {
  $redisFile = Join-Path $target 'redis.rdb'
  & redis-cli -u $env:REDIS_URL --rdb $redisFile
  if ($LASTEXITCODE -ne 0) { throw 'Redis backup failed' }
}
$files = Get-ChildItem -LiteralPath $target -File | ForEach-Object {
  $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName
  [ordered]@{ name = $_.Name; bytes = $_.Length; sha256 = $hash.Hash.ToLowerInvariant() }
}
$manifest = [ordered]@{ formatVersion = 1; createdAt = (Get-Date).ToUniversalTime().ToString('o'); files = @($files) }
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $target 'manifest.json') -Encoding utf8
Get-ChildItem -LiteralPath $root -Directory -Filter 'instaframe-*' | Where-Object { $_.CreationTimeUtc -lt (Get-Date).ToUniversalTime().AddDays(-$RetentionDays) } | ForEach-Object {
  if ([System.IO.Path]::GetFullPath($_.Parent.FullName) -ne $root) { throw 'Retention target escaped BackupRoot' }
  Remove-Item -LiteralPath $_.FullName -Recurse -Force
}
Write-Output "Backup completed: $target"
