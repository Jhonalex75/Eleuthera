<#
    First-time publish for the Eleuthera QA/QC dashboard.

        npm.cmd run setup

    Sign-in is NOT done here. `firebase login` needs a real interactive terminal
    to run its browser callback, and it does not get one through
    npm -> powershell -> firebase. So this script checks for a session and, if
    there is none, tells you to run `firebase login` directly and stops.

    Everything after sign-in is non-interactive and runs unattended. The script
    stops at the first real failure and always closes the Firestore write rule
    before exiting, so a failed run never leaves the database open.

    Safe to run again: each step detects work already done and skips it.
#>

Set-Location (Join-Path $PSScriptRoot "..")

$SITE = "eleuthera-qaqc"

function Step($n, $text) {
    Write-Host ""
    Write-Host "----------------------------------------------" -ForegroundColor DarkGray
    Write-Host " STEP $n of 3  $text" -ForegroundColor Cyan
    Write-Host "----------------------------------------------" -ForegroundColor DarkGray
}
function Ok($t)   { Write-Host "  OK   $t" -ForegroundColor Green }
function Info($t) { Write-Host "       $t" -ForegroundColor Gray }
function Die($t)  {
    Write-Host ""
    Write-Host "  STOPPED" -ForegroundColor Red
    Write-Host "  $t" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# --------------------------------------------------- sign-in check (not a step)
$store = Join-Path $env:USERPROFILE ".config\configstore\firebase-tools.json"
$signedIn = $false
$who = ""
if (Test-Path $store) {
    try {
        $cfg = Get-Content $store -Raw | ConvertFrom-Json
        if ($null -ne $cfg.user) { $signedIn = $true; $who = $cfg.user.email }
    } catch { }
}

if (-not $signedIn) {
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Yellow
    Write-Host " You are not signed in to Firebase yet." -ForegroundColor Yellow
    Write-Host "==============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Type this line by itself and press Enter:"
    Write-Host ""
    Write-Host "      firebase login" -ForegroundColor White
    Write-Host ""
    Write-Host "  A browser opens. Pick your Google account and click Allow."
    Write-Host "  Then double-click PUBLISH.cmd again."
    Write-Host ""
    Write-Host "  (Sign-in has to be typed directly into a terminal. It needs the"
    Write-Host "   terminal to itself to finish the browser handshake, and it does"
    Write-Host "   not get that when something else launches it.)"
    Write-Host ""
    exit 1
}
Write-Host ""
Ok "Signed in as $who"

# ------------------------------------------------------- 1. create the site
Step 1 "Create the hosting site '$SITE'"
$sites = (& firebase hosting:sites:list --json | Out-String)
if ($sites -match [regex]::Escape($SITE)) {
    Ok "Site '$SITE' already exists."
} else {
    & firebase hosting:sites:create $SITE
    if ($LASTEXITCODE -ne 0) {
        Die "Could not create '$SITE' - the message above says why. If the name is taken by someone else, pick another and change it in BOTH .firebaserc and the site:create script in package.json."
    }
    Ok "Site created."
}

# ------------------------------------------------ 2. upload the register
Step 2 "Upload the register to Firestore"
Info "Opening the write rule, uploading 572 records, closing it again."
Write-Host ""

& firebase deploy --only firestore:rules --config firebase.seed.json
if ($LASTEXITCODE -ne 0) { Die "Could not open the write rule. Nothing was changed." }

& node scripts/seed-firestore.mjs
$seedFailed = ($LASTEXITCODE -ne 0)

Write-Host ""
Info "Closing the write rule..."
& firebase deploy --only firestore:rules --config firebase.json
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  WARNING: the write rule is still OPEN." -ForegroundColor Yellow
    Write-Host "  Run this now:  npm.cmd run rules:lock" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
if ($seedFailed) { Die "The upload failed, but the write rule was closed again. The message above says why." }
Ok "Register uploaded. The database is read-only again."

# ------------------------------------------------------------- 3. deploy
Step 3 "Build and publish the site"
& npm.cmd run build:static
if ($LASTEXITCODE -ne 0) {
    Die "The build failed. If it mentions 'Cannot find native binding', run: npm.cmd run fix:native"
}
& firebase deploy --only "hosting:eleuthera"
if ($LASTEXITCODE -ne 0) { Die "The deploy failed - the message above says why." }

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host " DONE" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Your link:  https://$SITE.web.app" -ForegroundColor White
Write-Host ""
Write-Host "  Share that URL. It works on phones and needs no install."
Write-Host ""
Write-Host "  From now on:"
Write-Host "    data changed  ->  npm.cmd run publish   (open screens update themselves)"
Write-Host "    code changed  ->  npm.cmd run deploy"
Write-Host ""
