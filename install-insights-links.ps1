# VendorHub installer: insights link on My listings + enquiries and offers by week
# Run from the VendorHub project folder:
#   powershell -ExecutionPolicy Bypass -File .\install-insights-links.ps1
#
# What it does:
#   1. Backs up the two files it changes.
#   2. Adds an "Insights" link to each live, under offer, sold or withdrawn listing on My listings.
#   3. Adds an "Enquiries and offers by week" table under the views chart on the insights page.
#   4. Runs a typecheck. If the typecheck fails, both files are put back exactly as they were.
# It is safe to run twice - anything already added is skipped.

$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
$utf8 = New-Object System.Text.UTF8Encoding($false)

$listPath     = Join-Path $root "src\app\(authenticated)\account\listings\page.tsx"
$insightsPath = Join-Path $root "src\app\(authenticated)\account\listings\[id]\insights\page.tsx"

foreach ($p in @($listPath, $insightsPath)) {
  if (-not [System.IO.File]::Exists($p)) {
    Write-Host "File not found - nothing changed: $p" -ForegroundColor Red
    exit 1
  }
}

function Read-Text($path) {
  $t = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
  return @{ Text = ($t -replace "`r`n", "`n"); Crlf = $t.Contains("`r`n") }
}

function Write-Text($path, $text, $crlf) {
  if ($crlf) { $text = $text -replace "`n", "`r`n" }
  [System.IO.File]::WriteAllText($path, $text, $utf8)
}

# ---------- Backups ----------
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $root ".installer-backups\insights-links-$stamp"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
[System.IO.File]::Copy($listPath, (Join-Path $backupDir "listings-page.tsx"))
[System.IO.File]::Copy($insightsPath, (Join-Path $backupDir "insights-page.tsx"))
Write-Host "Backups saved to $backupDir"

$changed = @()

# ---------- 1. My listings: add Insights link ----------
$list = Read-Text $listPath
if ($list.Text.Contains("/insights")) {
  Write-Host "My listings: Insights link already there - skipped"
} else {
  $pattern = '\{\["draft", "rejected"\]\.includes\(l\.status\) \? "Edit" : "View"\}\s*</Link>'
  $m = [regex]::Match($list.Text, $pattern)
  if (-not $m.Success) {
    Write-Host "My listings: couldn't find the Edit/View link - nothing changed. Paste this to Copilot." -ForegroundColor Red
    exit 1
  }
  $insert = @'

                    {["live", "under_offer", "sold", "withdrawn"].includes(l.status) && (
                      <Link
                        href={`/account/listings/${l.id}/insights`}
                        className="ml-3 text-sm underline"
                      >
                        Insights
                      </Link>
                    )}
'@ -replace "`r`n", "`n"
  $insert = $insert.TrimEnd("`n")
  $at = $m.Index + $m.Length
  $newText = $list.Text.Substring(0, $at) + $insert + $list.Text.Substring($at)
  Write-Text $listPath $newText $list.Crlf
  $changed += "My listings: Insights link added"

  if ($newText.Contains("???")) {
    Write-Host "Note: My listings contains '???' - some symbols may have been lost in an earlier save. Tell Copilot." -ForegroundColor Yellow
  }
}

# ---------- 2. Insights page: enquiries and offers by week ----------
$ins = Read-Text $insightsPath
if ($ins.Text.Contains("Enquiries and offers by week")) {
  Write-Host "Insights page: weekly enquiries and offers already there - skipped"
} else {
  $pattern = '<span>This week</span>\s*</div>\s*</Section>'
  $m = [regex]::Match($ins.Text, $pattern)
  if (-not $m.Success) {
    Write-Host "Insights page: couldn't find the end of the views chart - restoring and stopping. Paste this to Copilot." -ForegroundColor Red
    [System.IO.File]::Copy((Join-Path $backupDir "listings-page.tsx"), $listPath, $true)
    exit 1
  }
  $insert = @'


      <Section
        title="Enquiries and offers by week"
        sub="New enquiries and first offers each week. Counter offers aren't counted."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-center text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="py-1 pr-2 text-left font-normal">Week of</th>
                {d.weeks.map((w) => (
                  <th key={w.week} className="py-1 font-normal">
                    {weekLabel(w.week)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="py-1.5 pr-2 text-left text-slate-700">Enquiries</td>
                {d.weeks.map((w) => (
                  <td key={w.week} className={w.enquiries ? "py-1.5 font-semibold text-slate-900" : "py-1.5 text-slate-300"}>
                    {w.enquiries}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-slate-100">
                <td className="py-1.5 pr-2 text-left text-slate-700">Offers</td>
                {d.weeks.map((w) => (
                  <td key={w.week} className={w.offers ? "py-1.5 font-semibold text-slate-900" : "py-1.5 text-slate-300"}>
                    {w.offers}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
'@ -replace "`r`n", "`n"
  $insert = $insert.TrimEnd("`n")
  $at = $m.Index + $m.Length
  $newText = $ins.Text.Substring(0, $at) + $insert + $ins.Text.Substring($at)
  Write-Text $insightsPath $newText $ins.Crlf
  $changed += "Insights page: enquiries and offers by week added"
}

if ($changed.Count -eq 0) {
  Write-Host "Nothing to change - both updates were already in place."
}
$changed | ForEach-Object { Write-Host $_ -ForegroundColor Green }

# ---------- 3. Typecheck ----------
Write-Host "Running typecheck..."
$out = & npx tsc --noEmit 2>&1
$code = $LASTEXITCODE
if ($code -eq 0) {
  Write-Host "Typecheck passed (exit 0)." -ForegroundColor Green
} else {
  Write-Host "Typecheck FAILED (exit $code). Restoring both files from backup." -ForegroundColor Red
  [System.IO.File]::Copy((Join-Path $backupDir "listings-page.tsx"), $listPath, $true)
  [System.IO.File]::Copy((Join-Path $backupDir "insights-page.tsx"), $insightsPath, $true)
  Write-Host "===== Typecheck errors (paste this to Copilot) ====="
  $out | Select-Object -Last 30 | ForEach-Object { Write-Host $_ }
  exit 1
}
