param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [int]$DelaySeconds = 3,
  [switch]$IncludeExisting
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$auditPath = Join-Path $RepoRoot 'data\intelligence\2026-09-15-full-program-data-audit.json'
$ratingPath = Join-Path $RepoRoot 'data\ratings\2026-09-15-ras-public-peaks.json'
$outputDir = Join-Path $RepoRoot 'output\ras-rating-scrape'
$rawDir = Join-Path $outputDir 'raw'
New-Item -ItemType Directory -Force -Path $rawDir | Out-Null

$audit = Get-Content -Raw $auditPath | ConvertFrom-Json
$ratings = Get-Content -Raw $ratingPath | ConvertFrom-Json
$existing = @{}
$ratings.ratings.PSObject.Properties | ForEach-Object { $existing[$_.Name] = [int]$_.Value }
$horses = if ($IncludeExisting) { @($audit.horses.horse) } else { @($audit.missing.rasPublicRating) }
$headers = @{
  'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36'
  'Accept-Language' = 'en-AU,en;q=0.9'
}

function ConvertTo-PlainText {
  param([string]$Html)
  $text = $Html -replace '(?is)<script.*?</script>', ' '
  $text = $text -replace '(?is)<style.*?</style>', ' '
  $text = $text -replace '(?s)<[^>]+>', ' '
  $text = [System.Net.WebUtility]::HtmlDecode($text)
  return ($text -replace '\s+', ' ').Trim()
}

function Find-RasUrls {
  param([string]$Horse)
  $q = [uri]::EscapeDataString(('site:racingandsports.com.au "{0}" "rating"' -f $Horse))
  try { $html = (Invoke-WebRequest -Uri "https://www.google.com/search?q=$q" -Headers $headers -TimeoutSec 30).Content }
  catch { return @() }
  return @([regex]::Matches($html, 'https://www\.racingandsports\.com\.au/[^"&<> ]+').Value |
    ForEach-Object { [System.Net.WebUtility]::HtmlDecode($_) -replace '%3F.*$','' } |
    Where-Object { $_ -match '/(thoroughbred/horse|news/racing)/' } | Select-Object -Unique)
}

$rows = [System.Collections.Generic.List[object]]::new()
foreach ($horse in $horses) {
  Write-Host ("[{0}/{1}] {2}" -f ($rows.Count + 1), $horses.Count, $horse)
  $urls = @(Find-RasUrls -Horse $horse)
  $status = 'NO_PUBLIC_RAS_PAGE'; $candidate = $null; $evidence = $null; $sourceUrl = $null
  foreach ($url in $urls | Select-Object -First 6) {
    Start-Sleep -Seconds $DelaySeconds
    try {
      $html = (Invoke-WebRequest -Uri $url -Headers $headers -TimeoutSec 45).Content
      if ($html -match '(?i)verify you are human|performing security verification|cf-chl-') { $status = 'CLOUDFLARE_BLOCKED'; continue }
      $plain = ConvertTo-PlainText $html
      $safeName = $horse -replace '[^A-Za-z0-9_-]', '_'
      Set-Content -Path (Join-Path $rawDir ("{0}_{1}.txt" -f $safeName, [Math]::Abs($url.GetHashCode()))) -Value "URL=$url`r`nHORSE=$horse`r`n`r`n$plain" -Encoding utf8
      $patterns = @(
        '(?i)Racing\s*(?:and|&)\s*Sports\s+(?:peak\s+)?rating\D{0,25}(?<rating>\d{2,3})',
        '(?i)R&S\s+(?:peak\s+)?rating\D{0,25}(?<rating>\d{2,3})',
        '(?i)(?:career|new|peak|top)\s+rating\D{0,25}(?<rating>\d{2,3})'
      )
      foreach ($pattern in $patterns) {
        $m = [regex]::Match($plain, $pattern)
        if ($m.Success) {
          $value = [int]$m.Groups['rating'].Value
          if ($value -ge 50 -and $value -le 140) {
            $candidate = $value; $sourceUrl = $url; $status = 'CANDIDATE_REQUIRES_REVIEW'
            $start = [Math]::Max(0, $m.Index - 140); $length = [Math]::Min(420, $plain.Length - $start)
            $evidence = $plain.Substring($start, $length); break
          }
        }
      }
      if ($candidate) { break }
      if ($status -ne 'CLOUDFLARE_BLOCKED') { $status = 'PAGE_FOUND_NO_EXPLICIT_RAS_RATING' }
    } catch { $status = if ($_.Exception.Response.StatusCode.value__ -eq 403) { 'HTTP_403' } else { 'FETCH_ERROR' } }
  }
  $rows.Add([pscustomobject]@{ horse=$horse; existing_rating=$(if ($existing.ContainsKey($horse)) {$existing[$horse]} else {$null}); candidate_rating=$candidate; status=$status; source_url=$sourceUrl; evidence=$evidence; urls_checked=($urls -join ' | ') })
  Start-Sleep -Seconds $DelaySeconds
}

$csvPath = Join-Path $outputDir 'ras_rating_candidates.csv'
$jsonPath = Join-Path $outputDir 'ras_rating_candidates.json'
$summaryPath = Join-Path $outputDir 'ras_rating_scrape_summary.txt'
$rows | Export-Csv -NoTypeInformation -Encoding utf8 -Path $csvPath
$rows | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 -Path $jsonPath
@(
  'RACING & SPORTS PUBLIC RATING SCRAPE',
  ('RUN_UTC={0}' -f [DateTime]::UtcNow.ToString('o')),
  ('HORSES={0}' -f $rows.Count),
  ('CANDIDATES={0}' -f @($rows | Where-Object status -eq 'CANDIDATE_REQUIRES_REVIEW').Count),
  ('NO_EXPLICIT_RATING={0}' -f @($rows | Where-Object status -eq 'PAGE_FOUND_NO_EXPLICIT_RAS_RATING').Count),
  ('NO_PAGE={0}' -f @($rows | Where-Object status -eq 'NO_PUBLIC_RAS_PAGE').Count),
  ('BLOCKED={0}' -f @($rows | Where-Object status -match 'BLOCKED|403').Count),
  '',
  'Candidates are not automatically promoted into the canonical ratings file.',
  'Review evidence text to ensure the number is explicitly an R&S rating, not an official handicap rating.'
) | Set-Content -Encoding utf8 -Path $summaryPath
Get-Content $summaryPath
Write-Host "CSV=$csvPath"
Write-Host "JSON=$jsonPath"
