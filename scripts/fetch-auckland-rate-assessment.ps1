param(
    [int]$PageSize = 2000,
    [int]$SnoozeMs = 250,
    [int]$ResumeFrom = 0
)

$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.+)$") {
            [System.Environment]::SetEnvironmentVariable(
                $Matches[1].Trim(), $Matches[2].Trim(), "Process"
            )
        }
    }
    Write-Host "[OK] Loaded .env.local" -ForegroundColor Green
}

if (-not $env:NEXT_PUBLIC_SUPABASE_URL)  { throw "Missing NEXT_PUBLIC_SUPABASE_URL" }
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) { throw "Missing SUPABASE_SERVICE_ROLE_KEY" }

$LayerUrl = "https://mapspublic.aucklandcouncil.govt.nz/arcgis/rest/services/Landbase/MapServer/37/query"

function Normalize-Address([string]$s) {
    if (-not $s) { return $null }
    $n = $s -replace "(\r\n|\r|\n)+", " "
    $n = $n.Trim().ToLower()
    $n = $n -replace "[,\.]", ""
    $n = $n -replace "\s+", " "
    return $n
}

function Convert-EpochToDate($epoch) {
    if (-not $epoch) { return $null }
    $origin = New-Object DateTime(1970, 1, 1, 0, 0, 0, [System.DateTimeKind]::Utc)
    return $origin.AddMilliseconds($epoch).ToString("yyyy-MM-dd")
}

function Send-SupaBatch {
    param([array]$Batch)

    $url = "$($env:NEXT_PUBLIC_SUPABASE_URL)/rest/v1/nz_akl_rate_assessment?on_conflict=rate_account_key"
    $headers = @{
        "apikey"        = $env:SUPABASE_SERVICE_ROLE_KEY
        "Authorization" = "Bearer $($env:SUPABASE_SERVICE_ROLE_KEY)"
        "Content-Type"  = "application/json"
        "Prefer"        = "resolution=merge-duplicates"
    }

    $body = $Batch | ConvertTo-Json -Depth 6 -Compress
    if ($Batch.Count -eq 1) { $body = "[$body]" }

    Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body | Out-Null
}

Write-Host ""
Write-Host "=== Auckland Council Rate Assessment ===" -ForegroundColor Cyan
Write-Host "PageSize: $PageSize | ResumeFrom: $ResumeFrom" -ForegroundColor DarkGray

$lastId = $ResumeFrom
$total  = 0

while ($true) {
    $encodedWhere = [System.Uri]::EscapeDataString("OBJECTID > $lastId")
    $fields = "OBJECTID,FORMATTEDADDRESS,CT,LEGAL,RATESASSESSMENTNUM,RATEACCOUNTKEY,VALUATIONREF,CV,LV,IV,VALUATIONDATE,LATESTVALUATIONDATE,RATEABILITY,IMPROVEMENT,LANDUSEDESCRIPTION,AREALABEL,GSTFLAG"

    $queryUrl = "${LayerUrl}?where=${encodedWhere}&outFields=${fields}&orderByFields=OBJECTID&resultRecordCount=${PageSize}&returnGeometry=false&f=json"

    try {
        $resp = Invoke-RestMethod -Uri $queryUrl -Method GET -TimeoutSec 120
    }
    catch {
        Write-Warning "Fetch failed at OBJECTID>$lastId : $($_.Exception.Message)"
        break
    }

    $features = $resp.features
    if (-not $features -or $features.Count -eq 0) { break }

    $rows = [System.Collections.Generic.List[Object]]::new()

    foreach ($f in $features) {
        $a = $f.attributes

        $rows.Add([PSCustomObject]@{
            rate_account_key       = [string]$a.RATEACCOUNTKEY
            rates_assessment_num   = [string]$a.RATESASSESSMENTNUM
            formatted_address      = [string]$a.FORMATTEDADDRESS
            address_norm           = (Normalize-Address ([string]$a.FORMATTEDADDRESS))
            valuation_ref          = [string]$a.VALUATIONREF
            ct                     = [string]$a.CT
            legal                  = [string]$a.LEGAL
            cv                     = $a.CV
            lv                     = $a.LV
            iv                     = $a.IV
            valuation_date         = (Convert-EpochToDate $a.VALUATIONDATE)
            latest_valuation_date  = (Convert-EpochToDate $a.LATESTVALUATIONDATE)
            land_use_description   = [string]$a.LANDUSEDESCRIPTION
            improvement            = [string]$a.IMPROVEMENT
            arealabel              = [string]$a.AREALABEL
            rateability            = [string]$a.RATEABILITY
            gstflag                = [string]$a.GSTFLAG
            objectid               = [int64]$a.OBJECTID
        })

        $lastId = [int64]$a.OBJECTID
    }

    try {
        Send-SupaBatch -Batch $rows
    }
    catch {
        Write-Warning "Upsert failed near OBJECTID=$lastId - skipping batch"
    }

    $total += $rows.Count
    Write-Host "  $total rows (OBJECTID $lastId)" -ForegroundColor DarkGray

    Start-Sleep -Milliseconds $SnoozeMs
}

Write-Host ""
Write-Host "Auckland Rate Assessment COMPLETE. Total: $total" -ForegroundColor Green