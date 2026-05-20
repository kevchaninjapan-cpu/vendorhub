# ═══════════════════════════════════════════════════════════════
# VendorHub — LINZ Data Fetcher v3 (FIXED)
# ═══════════════════════════════════════════════════════════════

param(
    [ValidateSet("dvr", "addresses", "all")]
    [string]$Dataset = "dvr"
)

# ── Load .env.local ──────────────────────────────────────────
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

# ── Validate env vars ────────────────────────────────────────
if (-not $env:LINZ_API_KEY)              { throw "Missing LINZ_API_KEY" }
if (-not $env:NEXT_PUBLIC_SUPABASE_URL)  { throw "Missing NEXT_PUBLIC_SUPABASE_URL" }
if (-not $env:SUPABASE_SERVICE_ROLE_KEY) { throw "Missing SUPABASE_SERVICE_ROLE_KEY" }

Write-Host "Supabase: $env:NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor DarkGray
Write-Host "LINZ key: $($env:LINZ_API_KEY.Substring(0,8))..." -ForegroundColor DarkGray

$LINZ_WFS = "https://data.linz.govt.nz/services;key=$($env:LINZ_API_KEY)/wfs"

$WFS_PAGE_SIZE = 5000
$SUPA_BATCH    = 500

# ── Supabase Upsert (uses $env: directly — no scoping issues) ──

function Send-SupaBatch {
    param(
        [string]$Table,
        [array]$Batch,
        [string]$Conflict
    )

    $url = "$($env:NEXT_PUBLIC_SUPABASE_URL)/rest/v1/$Table"
    if ($Conflict) { $url += "?on_conflict=$Conflict" }

    $headers = @{
        "apikey"        = $env:SUPABASE_SERVICE_ROLE_KEY
        "Authorization" = "Bearer $($env:SUPABASE_SERVICE_ROLE_KEY)"
        "Content-Type"  = "application/json"
        "Prefer"        = "resolution=merge-duplicates"
    }

    $body = $Batch | ConvertTo-Json -Depth 5 -Compress
    if ($Batch.Count -eq 1) { $body = "[$body]" }

    try {
        Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body -ErrorAction Stop | Out-Null
    }
    catch {
        Write-Warning "  FAIL on $Table : $($_.Exception.Message)"
        Write-Warning "  URL: $url"
    }
}

# ── Fetch LINZ WFS (paginated GeoJSON) ──────────────────────

function Fetch-WFS {
    param([string]$TypeName)

    $all = [System.Collections.Generic.List[Object]]::new()
    $start = 0

    while ($true) {
        $url = "$LINZ_WFS" +
            "?SERVICE=WFS" +
            "&VERSION=2.0.0" +
            "&REQUEST=GetFeature" +
            "&typeNames=$TypeName" +
            "&count=$WFS_PAGE_SIZE" +
            "&startIndex=$start" +
            "&outputFormat=json"

        Write-Host "  Fetching startIndex=$start ..." -NoNewline

        try {
            $resp = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 120 -ErrorAction Stop
        }
        catch {
            Write-Warning " WFS ERROR: $($_.Exception.Message)"
            break
        }

        $features = $resp.features
        $count = if ($features) { $features.Count } else { 0 }

        Write-Host " $count rows" -ForegroundColor Green

        if ($count -eq 0) { break }

        foreach ($f in $features) { $all.Add($f) }
        $start += $count

        if ($count -lt $WFS_PAGE_SIZE) { break }

        Start-Sleep -Milliseconds 300
    }

    Write-Host "  Total: $($all.Count)" -ForegroundColor Yellow
    return $all
}

# ═══════════════════════════════════════════════════════════════
# DVR Pipeline
# ═══════════════════════════════════════════════════════════════

function Load-DVR {
    Write-Host "`n=== DVR (table-114085) ===" -ForegroundColor Cyan

    # ── FETCH ─────────────────────────────────────────────────
    $features = Fetch-WFS "table-114085"
    if ($features.Count -eq 0) { Write-Warning "No data returned"; return }

    # ── MAP (fast — uses List.Add) ────────────────────────────
    Write-Host "`n[MAP] Converting..." -ForegroundColor Cyan

    $rows = [System.Collections.Generic.List[Object]]::new()

    foreach ($f in $features) {
        $p = $f.properties
        $rows.Add([PSCustomObject]@{
            unit_of_property_id              = $p.unit_of_property_id
            district_ta_code                 = $p.district_ta_code
            situation_name                   = $p.situation_name
            legal_description                = $p.legal_description
            land_area                        = $p.land_area
            property_category                = $p.property_category
            current_effective_valuation_date = $p.current_effective_valuation_date
            capital_value                    = $p.capital_value
            land_value                       = $p.land_value
            improvements_value               = $p.improvements_value
            no_of_bedrooms                   = $p.no_of_bedrooms
            off_street_parking               = $p.off_street_parking
            zoning                           = $p.zoning
            actual_property_use              = $p.actual_property_use
            building_total_floor_area        = $p.building_total_floor_area
            mass_total_living_area           = $p.mass_total_living_area
        })
    }

    Write-Host "  Mapped $($rows.Count) rows" -ForegroundColor Green

    # ── UPSERT (batched) ──────────────────────────────────────
    Write-Host "`n[UPSERT] Loading into Supabase..." -ForegroundColor Cyan

    $total = $rows.Count
    for ($i = 0; $i -lt $total; $i += $SUPA_BATCH) {
        $end = [Math]::Min($i + $SUPA_BATCH, $total)
        $batch = $rows.GetRange($i, $end - $i)

        Send-SupaBatch -Table "nz_dvr_114085" -Batch $batch -Conflict "unit_of_property_id"

        $pct = [Math]::Round(($end / $total) * 100)
        Write-Host "  $end / $total ($pct%)" -ForegroundColor DarkGray
    }

    Write-Host "`n✅ DVR COMPLETE" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

$startTime = Get-Date

switch ($Dataset) {
    "dvr"       { Load-DVR }
    "addresses" { Write-Host "Addresses loader coming next" }
    "all"       { Load-DVR }
}

$elapsed = (Get-Date) - $startTime
Write-Host "`nDone in $([Math]::Round($elapsed.TotalMinutes, 1)) min" -ForegroundColor Cyan