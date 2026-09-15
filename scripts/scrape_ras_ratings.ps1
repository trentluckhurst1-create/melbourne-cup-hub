param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [int]$DelaySeconds = 2,
  [switch]$IncludeExisting
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$auditPath = Join-Path $RepoRoot 'data\intelligence\2026-09-15-full-program-data-audit.json'
$ratingPath = Join-Path $RepoRoot 'data\ratings\2026-09-15-ras-public-peaks.json'
$outputDir = Join-Path $RepoRoot 'output\ras-rating-scrape'
$rawDir = Join-Path $outputDir 'raw'
New-Item -ItemType Directory -Force -Path $rawDir | Out-Null

$audit = [IO.File]::ReadAllText($auditPath, [Text.Encoding]::UTF8) | ConvertFrom-Json
$ratings = [IO.File]::ReadAllText($ratingPath, [Text.Encoding]::UTF8) | ConvertFrom-Json
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

function ConvertTo-Slug {
  param([string]$Horse)
  $s = $Horse.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object Text.StringBuilder
  foreach ($c in $s.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark) { [void]$sb.Append($c) }
  }
  $s = $sb.ToString().Normalize([Text.NormalizationForm]::FormC).ToLowerInvariant()
  $s = $s -replace '[’''`]', ''
  $s = $s -replace '[^a-z0-9]+', '-'
  return $s.Trim('-')
}

function Add-RasHorseUrlsFromHtml {
  param([string]$Html, [System.Collections.Generic.List[string]]$Found)
  $decodedHtml = [System.Net.WebUtility]::HtmlDecode($Html)
  $patterns = @(
    'https?://(?:www\.)?racingandsports\.com\.au/thoroughbred/horse/[a-z0-9-]+/\d+',
    '(?:https?%3A%2F%2F)?(?:www\.)?racingandsports\.com\.au%2Fthoroughbred%2Fhorse%2F[a-z0-9%\-]+%2F\d+',
    '/thoroughbred/horse/[a-z0-9-]+/\d+'
  )
  foreach ($p in $patterns) {
    foreach ($m in [regex]::Matches($decodedHtml, $p, 'IgnoreCase')) {
      $u = [uri]::UnescapeDataString($m.Value)
      if ($u -like '/thoroughbred/*') { $u = 'https://www.racingandsports.com.au' + $u }
      if ($u -notmatch '^https?://') { $u = 'https://' + $u }
      if ($u -match '^https://(?:www\.)?racingandsports\.com\.au/thoroughbred/horse/[a-z0-9-]+/\d+$') { $Found.Add($u) }
    }
  }
}

function Find-RasUrls {
  param([string]$Horse)
  $slug = ConvertTo-Slug $Horse
  $found = [System.Collections.Generic.List[string]]::new()
  $queries = @(
    ('site:racingandsports.com.au/thoroughbred/horse "{0}"' -f $Horse),
    ('site:racingandsports.com.au/thoroughbred/horse/{0} "{1}"' -f $slug, $Horse),
    ('racing and sports {0} horse' -f $Horse)
  )

  foreach ($query in $queries) {
    $q = [uri]::EscapeDataString($query)
    try {
      $html = (Invoke-WebRequest -UseBasicParsing -Uri "https://www.google.com/search?num=10&q=$q" -Headers $headers -TimeoutSec 30).Content
      Add-RasHorseUrlsFromHtml -Html $html -Found $found
    } catch {}
    if ($found.Count -gt 0) { break }

    try {
      $html = (Invoke-WebRequest -UseBasicParsing -Uri "https://www.bing.com/search?q=$q&count=10" -Headers $headers -TimeoutSec 30).Content
      Add-RasHorseUrlsFromHtml -Html $html -Found $found
    } catch {}
    if ($found.Count -gt 0) { break }

    try {
      $html = (Invoke-WebRequest -UseBasicParsing -Uri "https://html.duckduckgo.com/html/?q=$q" -Headers $headers -TimeoutSec 30).Content
      Add-RasHorseUrlsFromHtml -Html $html -Found $found
      foreach ($m in [regex]::Matches($html, 'uddg=([^&"]+)')) {
        $decoded = [uri]::UnescapeDataString($m.Groups[1].Value)
        if ($decoded -match '^https://(?:www\.)?racingandsports\.com\.au/thoroughbred/horse/[a-z0-9-]+/\d+') { $found.Add($decoded) }
      }
    } catch {}
    if ($found.Count -gt 0) { break }
  }

  # Last-resort search against the R&S site itself. We only harvest explicit horse-profile URLs.
  try {
    $rq = [uri]::EscapeDataString($Horse)
    $html = (Invoke-WebRequest -UseBasicParsing -Uri "https://www.racingandsports.com.au/search?q=$rq" -Headers $headers -TimeoutSec 30).Content
    Add-RasHorseUrlsFromHtml -Html $html -Found $found
  } catch {}

  return @($found | Select-Object -Unique | Where-Object { $_ -match ('/thoroughbred/horse/' + [regex]::Escape($slug) + '/\d+$') })
}

$rows = [System.Collections.Generic.List[object]]::new()
$index = 0
foreach ($horse in $horses) {
  $index++
  Write-Host ("[{0}/{1}] {2}" -f $index, $horses.Count, $horse)
  $urls = @(Find-RasUrls -Horse $horse)
  $status = 'NO_PUBLIC_RAS_PAGE'; $candidate = $null; $evidence = $null; $sourceUrl = $null; $fetchError = $null

  foreach ($url in $urls | Select-Object -First 6) {
    Start-Sleep -Seconds $DelaySeconds
    try {
      $resp = Invoke-WebRequest -UseBasicParsing -Uri $url -Headers $headers -TimeoutSec 45
      $html = $resp.Content
      if ($html -match '(?i)verify you are human|performing security verification|cf-chl-|just a moment') { $status = 'CLOUDFLARE_BLOCKED'; continue }
      $plain = ConvertTo-PlainText $html
      if ($plain -notmatch ('(?i)\b' + [regex]::Escape(($horse -replace '[’'']','')) + '\b')) {
        $status = 'PAGE_IDENTITY_MISMATCH'; continue
      }
      $safeName = $horse -replace '[^A-Za-z0-9_-]', '_'
      Set-Content -Path (Join-Path $rawDir ("{0}_{1}.txt" -f $safeName, [Math]::Abs($url.GetHashCode()))) -Value "URL=$url`r`nHORSE=$horse`r`n`r`n$plain" -Encoding utf8

      $patterns = @(
        '(?i)Racing\s*(?:and|&)\s*Sports\s+(?:peak\s+)?rating\D{0,35}(?<rating>\d{2,3})',
        '(?i)R&S\s+(?:peak\s+)?rating\D{0,35}(?<rating>\d{2,3})',
        '(?i)(?:career|new|peak|top)\s+rating\D{0,35}(?<rating>\d{2,3})'
      )
      foreach ($pattern in $patterns) {
        $m = [regex]::Match($plain, $pattern)
        if ($m.Success) {
          $value = [int]$m.Groups['rating'].Value
          if ($value -ge 50 -and $value -le 140) {
            $candidate = $value; $sourceUrl = $url; $status = 'CANDIDATE_REQUIRES_REVIEW'
            $start = [Math]::Max(0, $m.Index - 180); $length = [Math]::Min(520, $plain.Length - $start)
            $evidence = $plain.Substring($start, $length); break
          }
        }
      }
      if ($candidate) { break }
      if ($status -notmatch 'BLOCKED|MISMATCH') { $status = 'PAGE_FOUND_NO_EXPLICIT_RAS_RATING'; $sourceUrl = $url }
    } catch {
      $fetchError = $_.Exception.Message
      $code = $null
      try { $code = $_.Exception.Response.StatusCode.value__ } catch {}
      $status = if ($code -eq 403) { 'HTTP_403' } elseif ($code -eq 404) { 'HTTP_404' } else { 'FETCH_ERROR' }
    }
  }

  $rows.Add([pscustomobject]@{
    horse=$horse
    slug=(ConvertTo-Slug $horse)
    existing_rating=$(if ($existing.ContainsKey($horse)) {$existing[$horse]} else {$null})
    candidate_rating=$candidate
    status=$status
    source_url=$sourceUrl
    evidence=$evidence
    urls_found=$urls.Count
    urls_checked=($urls -join ' | ')
    fetch_error=$fetchError
  })
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
  ('URLS_DISCOVERED={0}' -f @($rows | Where-Object urls_found -gt 0).Count),
  ('CANDIDATES={0}' -f @($rows | Where-Object status -eq 'CANDIDATE_REQUIRES_REVIEW').Count),
  ('NO_EXPLICIT_RATING={0}' -f @($rows | Where-Object status -eq 'PAGE_FOUND_NO_EXPLICIT_RAS_RATING').Count),
  ('NO_PAGE={0}' -f @($rows | Where-Object status -eq 'NO_PUBLIC_RAS_PAGE').Count),
  ('IDENTITY_MISMATCH={0}' -f @($rows | Where-Object status -eq 'PAGE_IDENTITY_MISMATCH').Count),
  ('BLOCKED={0}' -f @($rows | Where-Object status -match 'BLOCKED|403').Count),
  ('FETCH_ERRORS={0}' -f @($rows | Where-Object status -match '^FETCH_ERROR$|^HTTP_404$').Count),
  '',
  'Candidates are not automatically promoted into the canonical ratings file.',
  'Review evidence text to ensure the number is explicitly an R&S rating, not an official handicap rating.'
) | Set-Content -Encoding utf8 -Path $summaryPath
Get-Content $summaryPath
Write-Host "CSV=$csvPath"
Write-Host "JSON=$jsonPath"
