# Central account server for أكاديمية ركن وجد.
# Passwords live in data\accounts.json and are never served as a static file.
param([switch]$SelfTest)

if (-not $SelfTest) {
  $nodeExe = $null
  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCmd) { $nodeExe = $nodeCmd.Source }
  $cursorNode = Join-Path $env:LOCALAPPDATA "Programs\cursor\resources\app\resources\helpers\node.exe"
  if (-not $nodeExe -and (Test-Path $cursorNode)) { $nodeExe = $cursorNode }
  if ($nodeExe) {
    & $nodeExe (Join-Path $PSScriptRoot "server.js")
    exit $LASTEXITCODE
  }
}

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Web.Extensions

$Root = $PSScriptRoot
$DataDir = Join-Path $Root "data"
$DataFile = Join-Path $DataDir "accounts.json"
$Serializer = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$Serializer.MaxJsonLength = 10000000
$Port = 8080

function U {
  param([int[]]$Codes)
  -join ($Codes | ForEach-Object { [char]$_ })
}

$RoleAdmin = U 0x0645,0x062F,0x064A,0x0631
$RoleDirectress = U 0x0627,0x0644,0x0645,0x062F,0x064A,0x0631,0x0629
$RoleSupervisor = U 0x0645,0x0634,0x0631,0x0641
$RoleParent = U 0x0648,0x0644,0x064A,0x0020,0x0627,0x0644,0x0623,0x0645,0x0631
$RoleParentWord = U 0x0648,0x0644,0x064A
$RoleTeacher = U 0x0627,0x0644,0x0645,0x0639,0x0644,0x0645
$MsgBadLogin = U 0x0627,0x0633,0x0645,0x0020,0x0627,0x0644,0x0645,0x0633,0x062A,0x062E,0x062F,0x0645,0x0020,0x0623,0x0648,0x0020,0x0643,0x0644,0x0645,0x0629,0x0020,0x0627,0x0644,0x0645,0x0631,0x0648,0x0631,0x0020,0x063A,0x064A,0x0631,0x0020,0x0635,0x062D,0x064A,0x062D,0x0629,0x002E
$MsgInactive = U 0x0647,0x0630,0x0627,0x0020,0x0627,0x0644,0x062D,0x0633,0x0627,0x0628,0x0020,0x0645,0x0648,0x0642,0x0648,0x0641,0x002E,0x0020,0x062A,0x0648,0x0627,0x0635,0x0644,0x0020,0x0645,0x0639,0x0020,0x0625,0x062F,0x0627,0x0631,0x0629,0x0020,0x0627,0x0644,0x0623,0x0643,0x0627,0x062F,0x064A,0x0645,0x064A,0x0629,0x002E
$MsgAdminOnly = U 0x0647,0x0630,0x0627,0x0020,0x0627,0x0644,0x0625,0x062C,0x0631,0x0627,0x0621,0x0020,0x0644,0x0644,0x0645,0x062F,0x064A,0x0631,0x0020,0x0641,0x0642,0x0637,0x002E
$MsgSaved = U 0x062A,0x0645,0x0020,0x062D,0x0641,0x0638,0x0020,0x0643,0x0644,0x0645,0x0629,0x0020,0x0627,0x0644,0x0645,0x0631,0x0648,0x0631,0x0020,0x0641,0x064A,0x0020,0x0642,0x0627,0x0639,0x062F,0x0629,0x0020,0x0627,0x0644,0x062D,0x0633,0x0627,0x0628,0x0627,0x062A,0x002E
$MsgDuplicate = U 0x0627,0x0633,0x0645,0x0020,0x0627,0x0644,0x0645,0x0633,0x062A,0x062E,0x062F,0x0645,0x0020,0x0645,0x0648,0x062C,0x0648,0x062F,0x0020,0x0628,0x0627,0x0644,0x0641,0x0639,0x0644,0x060C,0x0020,0x064A,0x0631,0x062C,0x0649,0x0020,0x0627,0x062E,0x062A,0x064A,0x0627,0x0631,0x0020,0x0627,0x0633,0x0645,0x0020,0x0622,0x062E,0x0631,0x002E
$MsgMissing = U 0x0627,0x0644,0x0645,0x0633,0x062A,0x062E,0x062F,0x0645,0x0020,0x063A,0x064A,0x0631,0x0020,0x0645,0x0648,0x062C,0x0648,0x062F,0x002E
$MsgNeedFields = U 0x064A,0x0631,0x062C,0x0649,0x0020,0x0645,0x0644,0x0621,0x0020,0x062C,0x0645,0x064A,0x0639,0x0020,0x0627,0x0644,0x062D,0x0642,0x0648,0x0644,0x0020,0x0627,0x0644,0x0645,0x0637,0x0644,0x0648,0x0628,0x0629,0x002E
$MsgAdded = U 0x062A,0x0645,0x062A,0x0020,0x0625,0x0636,0x0627,0x0641,0x0629,0x0020,0x0627,0x0644,0x0645,0x0633,0x062A,0x062E,0x062F,0x0645,0x0020,0x0641,0x064A,0x0020,0x0642,0x0627,0x0639,0x062F,0x0629,0x0020,0x0627,0x0644,0x062D,0x0633,0x0627,0x0628,0x0627,0x062A,0x002E
$MsgDeleted = U 0x062A,0x0645,0x0020,0x062D,0x0630,0x0641,0x0020,0x0627,0x0644,0x0645,0x0633,0x062A,0x062E,0x062F,0x0645,0x0020,0x0645,0x0646,0x0020,0x0642,0x0627,0x0639,0x062F,0x0629,0x0020,0x0627,0x0644,0x062D,0x0633,0x0627,0x0628,0x0627,0x062A,0x002E
$MsgNoSelfStop = U 0x0644,0x0627,0x0020,0x064A,0x0645,0x0643,0x0646,0x0020,0x0625,0x064A,0x0642,0x0627,0x0641,0x0020,0x062D,0x0633,0x0627,0x0628,0x0643,0x0020,0x0627,0x0644,0x062D,0x0627,0x0644,0x064A,0x002E
$MsgKeepAdmin = U 0x0623,0x0628,0x0642,0x0650,0x0020,0x0645,0x062F,0x064A,0x0631,0x0627,0x064B,0x0020,0x0646,0x0634,0x0637,0x0627,0x064B,0x0020,0x0648,0x0627,0x062D,0x062F,0x0627,0x064B,0x0020,0x0639,0x0644,0x0649,0x0020,0x0627,0x0644,0x0623,0x0642,0x0644,0x002E
$MsgNoSelfDelete = U 0x0644,0x0627,0x0020,0x064A,0x0645,0x0643,0x0646,0x0020,0x062D,0x0630,0x0641,0x0020,0x0627,0x0644,0x062D,0x0633,0x0627,0x0628,0x0020,0x0627,0x0644,0x0630,0x064A,0x0020,0x062A,0x0633,0x062A,0x062E,0x062F,0x0645,0x0647,0x0020,0x0627,0x0644,0x0622,0x0646,0x002E
$MsgNoLastAdmin = U 0x0644,0x0627,0x0020,0x064A,0x0645,0x0643,0x0646,0x0020,0x062D,0x0630,0x0641,0x0020,0x0622,0x062E,0x0631,0x0020,0x0645,0x062F,0x064A,0x0631,0x0020,0x0646,0x0634,0x0637,0x002E
$MsgNoPrimary = U 0x0644,0x0627,0x0020,0x064A,0x0645,0x0643,0x0646,0x0020,0x062D,0x0630,0x0641,0x0020,0x062D,0x0633,0x0627,0x0628,0x0020,0x0627,0x0644,0x0645,0x062F,0x064A,0x0631,0x0020,0x0627,0x0644,0x0623,0x0633,0x0627,0x0633,0x064A,0x002E
$MsgActivated = U 0x062A,0x0645,0x0020,0x062A,0x0641,0x0639,0x064A,0x0644,0x0020,0x0627,0x0644,0x062D,0x0633,0x0627,0x0628,0x002E
$MsgStopped = U 0x062A,0x0645,0x0020,0x0625,0x064A,0x0642,0x0627,0x0641,0x0020,0x0627,0x0644,0x062D,0x0633,0x0627,0x0628,0x002E
$MsgPwLen = U 0x0643,0x0644,0x0645,0x0629,0x0020,0x0627,0x0644,0x0645,0x0631,0x0648,0x0631,0x0020,0x064A,0x062C,0x0628,0x0020,0x0623,0x0646,0x0020,0x062A,0x0643,0x0648,0x0646,0x0020,0x0645,0x0646,0x0020,0x0038,0x0020,0x0625,0x0644,0x0649,0x0020,0x0037,0x0032,0x0020,0x062D,0x0631,0x0641,0x0627,0x064B,0x002E
$MsgPwMix = U 0x0627,0x0633,0x062A,0x062E,0x062F,0x0645,0x0020,0x062D,0x0631,0x0648,0x0641,0x0627,0x064B,0x0020,0x0648,0x0623,0x0631,0x0642,0x0627,0x0645,0x0627,0x064B,0x0020,0x0645,0x0639,0x0627,0x064B,0x0020,0x0641,0x064A,0x0020,0x0643,0x0644,0x0645,0x0629,0x0020,0x0627,0x0644,0x0645,0x0631,0x0648,0x0631,0x002E
$MsgBadName = U 0x0627,0x0643,0x062A,0x0628,0x0020,0x0627,0x0644,0x0627,0x0633,0x0645,0x0020,0x0627,0x0644,0x0643,0x0627,0x0645,0x0644,0x0020,0x0645,0x0646,0x0020,0x062D,0x0631,0x0641,0x064A,0x0646,0x0020,0x0625,0x0644,0x0649,0x0020,0x0036,0x0030,0x0020,0x062D,0x0631,0x0641,0x0627,0x064B,0x002E
$MsgBadEmail = U 0x0627,0x0643,0x062A,0x0628,0x0020,0x0628,0x0631,0x064A,0x062F,0x0627,0x064B,0x0020,0x0625,0x0644,0x0643,0x062A,0x0631,0x0648,0x0646,0x064A,0x0627,0x064B,0x0020,0x0635,0x0627,0x0644,0x062D,0x0627,0x064B,0x002E
$MsgEmailUsed = U 0x0647,0x0630,0x0627,0x0020,0x0627,0x0644,0x0628,0x0631,0x064A,0x062F,0x0020,0x0645,0x0633,0x062C,0x0651,0x0644,0x0020,0x0628,0x0627,0x0644,0x0641,0x0639,0x0644,0x002E,0x0020,0x062C,0x0631,0x0651,0x0628,0x0020,0x062A,0x0633,0x062C,0x064A,0x0644,0x0020,0x0627,0x0644,0x062F,0x062E,0x0648,0x0644,0x002E
$MsgRole = U 0x0627,0x062E,0x062A,0x0631,0x0020,0x062F,0x0648,0x0631,0x0020,0x0627,0x0644,0x0645,0x0639,0x0644,0x0645,0x0020,0x0623,0x0648,0x0020,0x0648,0x0644,0x064A,0x0020,0x0627,0x0644,0x0623,0x0645,0x0631,0x002E,0x0020,0x062D,0x0633,0x0627,0x0628,0x0020,0x0627,0x0644,0x0645,0x062F,0x064A,0x0631,0x0020,0x0644,0x0627,0x0020,0x064A,0x064F,0x0646,0x0634,0x0623,0x0020,0x0645,0x0646,0x0020,0x0627,0x0644,0x062A,0x0633,0x062C,0x064A,0x0644,0x002E
$TeacherName = (U 0x0623) + ". " + (U 0x0633,0x0627,0x0631,0x0629) + " " + $RoleTeacher
$ParentName = (U 0x0623,0x062D,0x0645,0x062F) + " " + (U 0x0648,0x0644,0x064A,0x0020,0x0627,0x0644,0x0623,0x0645,0x0631)

$script:Db = $null

function Convert-ToPlain($Value) {
  if ($null -eq $Value) { return $null }
  if ($Value -is [string] -or $Value -is [bool] -or $Value -is [ValueType]) { return $Value }
  if ($Value -is [System.Collections.IDictionary]) {
    $table = @{}
    foreach ($key in @($Value.Keys)) { $table[[string]$key] = Convert-ToPlain $Value[$key] }
    return $table
  }
  if ($Value -is [System.Collections.IEnumerable]) {
    $list = New-Object System.Collections.ArrayList
    foreach ($item in $Value) { [void]$list.Add((Convert-ToPlain $item)) }
    return $list
  }
  return $Value
}

function Now-Ms {
  return [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
}

function Normalize-Role([string]$Role) {
  $Role = [string]$Role
  if ($Role.Contains($RoleDirectress)) { return $RoleAdmin }
  return $Role
}

function Get-PortalRole([string]$Label) {
  $Label = Normalize-Role $Label
  if ($Label.Contains($RoleSupervisor)) { return "supervisor" }
  if ($Label.Contains($RoleAdmin)) { return "admin" }
  if ($Label.Contains($RoleParentWord)) { return "parent" }
  return "teacher"
}

function Get-RoleLabel([string]$PortalRole) {
  if ($PortalRole -eq "admin") { return $RoleAdmin }
  if ($PortalRole -eq "supervisor") { return $RoleSupervisor }
  if ($PortalRole -eq "parent") { return $RoleParent }
  return $RoleTeacher
}

function Get-DisplayName([string]$Username, [string]$RoleLabel) {
  $RoleLabel = Normalize-Role $RoleLabel
  if ($RoleLabel.Contains($RoleSupervisor)) { return "$Username ($RoleSupervisor)" }
  if ($RoleLabel.Contains($RoleAdmin) -and $Username.ToLower() -eq "mohamed") { return "Dr. Mohamed Mohamed" }
  if ($RoleLabel.Contains($RoleAdmin)) { return $Username }
  if ($RoleLabel.Contains($RoleParentWord)) { return "$Username ($RoleParentWord $(U 0x0623,0x0645,0x0631))" }
  return ((U 0x0623) + ". $Username")
}

function New-Account([string]$Username, [string]$Password, [string]$RoleLabel, $Name, $Email) {
  $cleanRole = Normalize-Role $RoleLabel
  $cleanName = [string]$Username
  $cleanName = $cleanName.Trim()
  if ([string]::IsNullOrWhiteSpace([string]$Name)) { $Name = Get-DisplayName $cleanName $cleanRole }
  if ([string]::IsNullOrWhiteSpace([string]$Email)) { $Email = $cleanName.ToLower() + "@rokn-wajd.example" }
  return @{
    id = [guid]::NewGuid().ToString("N")
    username = $cleanName
    password = [string]$Password
    role = $cleanRole
    portalRole = (Get-PortalRole $cleanRole)
    name = [string]$Name
    email = ([string]$Email).Trim().ToLower()
    active = $true
    credVersion = 1
    createdAt = [DateTime]::UtcNow.ToString("o")
  }
}

function New-DefaultDb {
  $users = New-Object System.Collections.ArrayList
  [void]$users.Add((New-Account "mohamed" "112233" $RoleAdmin "Dr. Mohamed Mohamed" "mohamed@rokn-wajd.example"))
  [void]$users.Add((New-Account "teacher" "teacher123" $RoleTeacher $TeacherName "teacher@rokn-wajd.example"))
  [void]$users.Add((New-Account "parent" "parent123" $RoleParent $ParentName "parent@rokn-wajd.example"))
  return @{
    version = 1
    pristine = $true
    users = $users
    sessions = (New-Object System.Collections.ArrayList)
  }
}

function As-List($Value) {
  $list = New-Object System.Collections.ArrayList
  if ($null -eq $Value) { return $list }
  foreach ($item in @($Value)) {
    if ($null -ne $item) { [void]$list.Add($item) }
  }
  return $list
}

function To-JsonText($Value) {
  return ConvertTo-Json -InputObject $Value -Depth 12 -Compress
}

function Save-Db {
  if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir | Out-Null }
  $json = To-JsonText $script:Db
  $tmp = $DataFile + ".tmp"
  [IO.File]::WriteAllText($tmp, $json, [Text.UTF8Encoding]::new($false))
  if (Test-Path $DataFile) { Remove-Item $DataFile -Force }
  Move-Item $tmp $DataFile
}

function Load-Db {
  if (-not (Test-Path $DataFile)) {
    $script:Db = New-DefaultDb
    Save-Db
    return
  }
  $raw = [IO.File]::ReadAllText($DataFile, [Text.UTF8Encoding]::new($false))
  $script:Db = Convert-ToPlain $Serializer.DeserializeObject($raw)
  $script:Db.users = As-List $script:Db.users
  $script:Db.sessions = As-List $script:Db.sessions
  if ($null -eq $script:Db.pristine) { $script:Db.pristine = $false }
}

function Find-UserByName([string]$Name) {
  $key = $Name.Trim().ToLower()
  foreach ($user in @($script:Db.users)) {
    if ([string]$user["username"].Trim().ToLower() -eq $key) { return $user }
  }
  return $null
}

function Find-UserById([string]$Id) {
  foreach ($user in @($script:Db.users)) {
    if ([string]$user["id"] -eq $Id) { return $user }
  }
  return $null
}

function Find-UserByLogin([string]$Key) {
  $key = $Key.Trim().ToLower()
  foreach ($user in @($script:Db.users)) {
    $username = [string]$user["username"]
    $email = [string]$user["email"]
    if ($username.Trim().ToLower() -eq $key -or $email.Trim().ToLower() -eq $key) { return $user }
  }
  return $null
}

function Same-Secret([string]$Left, [string]$Right) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    $a = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes([string]$Left))
    $b = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes([string]$Right))
  } finally {
    $sha.Dispose()
  }
  $diff = 0
  for ($i = 0; $i -lt $a.Length; $i++) { $diff = $diff -bor ($a[$i] -bxor $b[$i]) }
  return $diff -eq 0
}

function Public-User($User, [switch]$WithPassword) {
  $out = @{
    id = [string]$User["id"]
    username = [string]$User["username"]
    name = [string]$User["name"]
    email = [string]$User["email"]
    role = [string]$User["role"]
    portalRole = [string]$User["portalRole"]
    active = ($User["active"] -eq $true)
    createdAt = [string]$User["createdAt"]
  }
  if ($WithPassword) { $out.password = [string]$User["password"] }
  return $out
}

function Portal-User($User) {
  $out = Public-User $User
  $out.role = [string]$User["portalRole"]
  return $out
}

function New-Session($User) {
  $session = @{
    token = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N"))
    userId = [string]$User["id"]
    exp = (Now-Ms) + (8 * 60 * 60 * 1000)
    credVersion = [int]$User["credVersion"]
  }
  [void]$script:Db.sessions.Add($session)
  return $session
}

function Remove-UserSessions([string]$UserId) {
  $keep = New-Object System.Collections.ArrayList
  foreach ($session in @($script:Db.sessions)) {
    if ([string]$session["userId"] -ne $UserId) { [void]$keep.Add($session) }
  }
  $script:Db.sessions = $keep
}

function Remove-Token([string]$Token) {
  $keep = New-Object System.Collections.ArrayList
  foreach ($session in @($script:Db.sessions)) {
    if ([string]$session["token"] -ne $Token) { [void]$keep.Add($session) }
  }
  $script:Db.sessions = $keep
}

function Find-Session([string]$Token) {
  if ([string]::IsNullOrWhiteSpace($Token)) { return $null }
  foreach ($session in @($script:Db.sessions)) {
    if ([string]$session["token"] -eq $Token) { return $session }
  }
  return $null
}

function Get-Actor([string]$Token) {
  $session = Find-Session $Token
  if (-not $session) { return $null }
  if ([int64]$session["exp"] -lt (Now-Ms)) { return $null }
  $user = Find-UserById ([string]$session["userId"])
  if (-not $user) { return $null }
  if ([int]$user["credVersion"] -ne [int]$session["credVersion"]) { return $null }
  if ($user["active"] -ne $true) { return $null }
  return $user
}

function Count-OtherAdmins([string]$ExceptId) {
  $count = 0
  foreach ($user in @($script:Db.users)) {
    if ([string]$user["id"] -eq $ExceptId) { continue }
    if ([string]$user["portalRole"] -eq "admin" -and $user["active"] -eq $true) { $count++ }
  }
  return $count
}

function Test-AdminPassword([string]$Password) {
  $Password = [string]$Password
  if ([string]::IsNullOrWhiteSpace($Password) -or $Password.Length -gt 72) { return $MsgNeedFields }
  return ""
}

function Test-PortalPassword([string]$Password) {
  $Password = [string]$Password
  if ($Password.Length -lt 8 -or $Password.Length -gt 72) { return $MsgPwLen }
  if ($Password -notmatch '[0-9]' -or $Password -notmatch '[A-Za-z\u0600-\u06FF]') { return $MsgPwMix }
  return ""
}

function Authenticate([string]$Username, [string]$Password) {
  $typed = [string]$Password
  $typed = $typed.Trim()
  $found = Find-UserByLogin ([string]$Username)
  $expected = "portal-dummy-password"
  if ($found) { $expected = [string]$found["password"] }
  $matches = Same-Secret $typed $expected
  if (-not $found -or -not $matches) { return @{ ok = $false; message = $MsgBadLogin } }
  if ($found["active"] -ne $true) { return @{ ok = $false; message = $MsgInactive } }
  return @{ ok = $true; user = $found }
}

function Issue-Login($User) {
  $session = New-Session $User
  Save-Db
  return @{
    ok = $true
    token = [string]$session["token"]
    exp = [int64]$session["exp"]
    user = (Public-User $User)
  }
}

function Is-FactorySet($Users) {
  $expected = @{ mohamed = "112233"; teacher = "teacher123"; parent = "parent123" }
  $list = @($Users)
  if ($list.Count -ne 3) { return $false }
  $seen = @{}
  foreach ($item in $list) {
    $name = [string]$item["username"]
    $name = $name.Trim().ToLower()
    $pass = [string]$item["password"]
    if (-not $expected.ContainsKey($name) -or $expected[$name] -ne $pass) { return $false }
    $seen[$name] = $true
  }
  return $seen["mohamed"] -and $seen["teacher"] -and $seen["parent"]
}

function Import-LocalUsers($Payload) {
  if ($script:Db.pristine -ne $true) { return @{ ok = $true; imported = $false; pristine = $false } }
  $incoming = @()
  if ($Payload -and $Payload["users"]) { $incoming = @($Payload["users"]) }
  if (-not $incoming.Count -or (Is-FactorySet $incoming)) {
    return @{ ok = $true; imported = $false; pristine = $true }
  }
  $fresh = New-Object System.Collections.ArrayList
  $seen = @{}
  foreach ($item in $incoming) {
    $name = [string]$item["username"]
    $name = $name.Trim()
    $pass = [string]$item["password"]
    $role = Normalize-Role ([string]$item["role"])
    if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($pass)) { continue }
    $key = $name.ToLower()
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true
    if (-not $role) { $role = $RoleTeacher }
    [void]$fresh.Add((New-Account $name $pass.Trim() $role $null $null))
  }
  if ($fresh.Count -eq 0) { return @{ ok = $false; message = $MsgNeedFields } }
  $script:Db.users = $fresh
  $script:Db.sessions = New-Object System.Collections.ArrayList
  $script:Db.pristine = $false
  Save-Db
  return @{ ok = $true; imported = $true; pristine = $false }
}

function Username-FromEmail([string]$Email) {
  $base = ($Email.Split("@")[0].ToLower() -replace '[^a-z0-9._-]', '')
  if ($base.Length -lt 3) { $base = "user" }
  if ($base.Length -gt 20) { $base = $base.Substring(0, 20) }
  $name = $base
  $n = 2
  while (Find-UserByName $name) {
    $name = $base + $n
    if ($name.Length -gt 24) { $name = $name.Substring(0, 24) }
    $n++
  }
  return $name
}

if ($SelfTest) {
  $DataFile = Join-Path $env:TEMP "rokn-accounts-selftest.json"
  $DataDir = Split-Path $DataFile
  if (Test-Path $DataFile) { Remove-Item $DataFile -Force }
  Load-Db
  $old = Authenticate "mohamed" "112233"
  if (-not $old.ok) { throw "default login failed" }
  $user = Find-UserByName "mohamed"
  $user["password"] = "NewPass99"
  $user["credVersion"] = [int]$user["credVersion"] + 1
  $script:Db.pristine = $false
  Save-Db
  Load-Db
  $stale = Authenticate "mohamed" "112233"
  $fresh = Authenticate "mohamed" "NewPass99"
  if ($stale.ok) { throw "old password still works" }
  if (-not $fresh.ok) { throw "new password was ignored" }
  Write-Output "selftest-ok"
  exit 0
}

function Send-Json($Response, [int]$Code, $Obj) {
  $json = To-JsonText $Obj
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $Response.StatusCode = $Code
  $Response.ContentType = "application/json; charset=utf-8"
  $Response.Headers["Cache-Control"] = "no-store"
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

function Send-Error($Response, [int]$Code, [string]$Message) {
  Send-Json $Response $Code @{ ok = $false; message = $Message }
}

function Read-Body($Request) {
  $reader = New-Object IO.StreamReader($Request.InputStream, [Text.UTF8Encoding]::new($false))
  try { $text = $reader.ReadToEnd() } finally { $reader.Dispose() }
  if ([string]::IsNullOrWhiteSpace($text)) { return @{} }
  return Convert-ToPlain $Serializer.DeserializeObject($text)
}

function Get-Bearer($Request) {
  $header = $Request.Headers["Authorization"]
  if ($header -and $header.StartsWith("Bearer ")) { return $header.Substring(7).Trim() }
  return ""
}

function Send-File($Response, [string]$Path) {
  $ext = [IO.Path]::GetExtension($Path).ToLower()
  $types = @{
    ".html" = "text/html; charset=utf-8"
    ".js" = "text/javascript; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png" = "image/png"
    ".jpg" = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg" = "image/svg+xml"
    ".ico" = "image/x-icon"
    ".webp" = "image/webp"
    ".md" = "text/plain; charset=utf-8"
  }
  $bytes = [IO.File]::ReadAllBytes($Path)
  $Response.StatusCode = 200
  $Response.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" })
  $Response.Headers["Cache-Control"] = "no-store"
  $Response.ContentLength64 = $bytes.Length
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

function Handle-Auth($Request, $Response, [string]$Path) {
  $body = @{}
  if ($Request.HttpMethod -ne "GET") { $body = Read-Body $Request }
  $token = Get-Bearer $Request
  if (-not $token -and $body["token"]) { $token = [string]$body["token"] }

  if ($Path -eq "/api/auth/status") {
    Send-Json $Response 200 @{ ok = $true; pristine = ($script:Db.pristine -eq $true) }
    return
  }
  if ($Path -eq "/api/auth/migrate" -and $Request.HttpMethod -eq "POST") {
    Send-Json $Response 200 (Import-LocalUsers $body)
    return
  }
  if ($Path -eq "/api/auth/check" -and $Request.HttpMethod -eq "POST") {
    $result = Authenticate ([string]$body["username"]) ([string]$body["password"])
    if (-not $result.ok) { Send-Json $Response 401 $result; return }
    Send-Json $Response 200 @{ ok = $true; user = (Public-User $result.user) }
    return
  }
  if ($Path -eq "/api/auth/login" -and $Request.HttpMethod -eq "POST") {
    $result = Authenticate ([string]$body["username"]) ([string]$body["password"])
    if (-not $result.ok) { Send-Json $Response 401 $result; return }
    Send-Json $Response 200 (Issue-Login $result.user)
    return
  }
  if ($Path -eq "/api/auth/verify" -and $Request.HttpMethod -eq "POST") {
    $session = Find-Session $token
    $actor = Get-Actor $token
    if (-not $actor -or -not $session) { Send-Error $Response 401 $MsgBadLogin; return }
    Send-Json $Response 200 @{ ok = $true; exp = [int64]$session["exp"]; user = (Public-User $actor) }
    return
  }
  if ($Path -eq "/api/auth/logout" -and $Request.HttpMethod -eq "POST") {
    Remove-Token $token
    Save-Db
    Send-Json $Response 200 @{ ok = $true }
    return
  }
  if ($Path -eq "/api/auth/register" -and $Request.HttpMethod -eq "POST") {
    $name = [string]$body["name"]
    $name = $name.Trim()
    $email = [string]$body["email"]
    $email = $email.Trim().ToLower()
    $password = [string]$body["password"]
    $role = [string]$body["role"]
    if ($name.Length -lt 2 -or $name.Length -gt 60 -or $name.Contains("<") -or $name.Contains(">")) {
      Send-Error $Response 400 $MsgBadName; return
    }
    if ($email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$' -or $email.Length -gt 80) {
      Send-Error $Response 400 $MsgBadEmail; return
    }
    $pwError = Test-PortalPassword $password
    if ($pwError) { Send-Error $Response 400 $pwError; return }
    if ($role -ne "teacher" -and $role -ne "parent") { Send-Error $Response 400 $MsgRole; return }
    foreach ($user in @($script:Db.users)) {
      if ([string]$user["email"] -eq $email) { Send-Error $Response 409 $MsgEmailUsed; return }
    }
    $username = Username-FromEmail $email
    $label = Get-RoleLabel $role
    [void]$script:Db.users.Add((New-Account $username $password $label $name $email))
    $script:Db.pristine = $false
    Save-Db
    $created = U 0x062A,0x0645,0x0020,0x0625,0x0646,0x0634,0x0627,0x0621,0x0020,0x0627,0x0644,0x062D,0x0633,0x0627,0x0628,0x002E,0x0020,0x0627,0x062F,0x062E,0x0644,0x0020,0x0628,0x0627,0x0644,0x0628,0x0631,0x064A,0x062F,0x0020,0x0623,0x0648,0x0020,0x0628,0x0627,0x0633,0x0645,0x0020,0x0627,0x0644,0x0645,0x0633,0x062A,0x062E,0x062F,0x0645,0x003A,0x0020
    Send-Json $Response 200 @{ ok = $true; username = $username; message = ($created + $username) }
    return
  }

  $actor = Get-Actor $token
  if (-not $actor -or [string]$actor["portalRole"] -ne "admin") {
    Send-Error $Response 403 $MsgAdminOnly
    return
  }

  if ($Path -eq "/api/auth/directory") {
    $rows = New-Object System.Collections.ArrayList
    foreach ($user in @($script:Db.users)) { [void]$rows.Add((Portal-User $user)) }
    Send-Json $Response 200 @{ ok = $true; users = $rows }
    return
  }
  if ($Path -eq "/api/auth/users" -and $Request.HttpMethod -eq "GET") {
    $rows = New-Object System.Collections.ArrayList
    foreach ($user in @($script:Db.users)) { [void]$rows.Add((Public-User $user -WithPassword)) }
    Send-Json $Response 200 @{ ok = $true; users = $rows }
    return
  }
  if ($Path -eq "/api/auth/users" -and $Request.HttpMethod -eq "POST") {
    $username = [string]$body["username"]
    $password = [string]$body["password"]
    $role = Normalize-Role ([string]$body["role"])
    $username = $username.Trim()
    $password = $password.Trim()
    $pwError = Test-AdminPassword $password
    if ([string]::IsNullOrWhiteSpace($username) -or $pwError) { Send-Error $Response 400 $MsgNeedFields; return }
    if ($username.Length -gt 40) { Send-Error $Response 400 $MsgBadName; return }
    if (Find-UserByName $username) { Send-Error $Response 409 $MsgDuplicate; return }
    if (-not $role) { $role = $RoleTeacher }
    [void]$script:Db.users.Add((New-Account $username $password $role $null $null))
    $script:Db.pristine = $false
    Save-Db
    Send-Json $Response 200 @{ ok = $true; message = $MsgAdded }
    return
  }
  if ($Path -eq "/api/auth/users/update" -and $Request.HttpMethod -eq "POST") {
    $oldName = [string]$body["oldUsername"]
    $username = [string]$body["username"]
    $password = [string]$body["password"]
    $role = Normalize-Role ([string]$body["role"])
    $username = $username.Trim()
    $password = $password.Trim()
    $target = Find-UserByName $oldName
    if (-not $target) { Send-Error $Response 404 $MsgMissing; return }
    $pwError = Test-AdminPassword $password
    if ([string]::IsNullOrWhiteSpace($username) -or $pwError) { Send-Error $Response 400 $MsgNeedFields; return }
    $other = Find-UserByName $username
    if ($other -and [string]$other["id"] -ne [string]$target["id"]) { Send-Error $Response 409 $MsgDuplicate; return }
    $nextPortal = Get-PortalRole $role
    if ([string]$target["portalRole"] -eq "admin" -and $nextPortal -ne "admin" -and (Count-OtherAdmins ([string]$target["id"])) -eq 0) {
      Send-Error $Response 400 $MsgKeepAdmin; return
    }
    $passwordChanged = -not (Same-Secret ([string]$target["password"]) $password)
    $target["username"] = $username
    $target["password"] = $password
    $target["role"] = $(if ($role) { $role } else { $RoleTeacher })
    $target["portalRole"] = (Get-PortalRole $target["role"])
    $target["name"] = Get-DisplayName $username $target["role"]
    $email = [string]$target["email"]
    if ($email.EndsWith("@rokn-wajd.example")) { $target["email"] = $username.ToLower() + "@rokn-wajd.example" }
    if ($passwordChanged) {
      $target["credVersion"] = [int]$target["credVersion"] + 1
      Remove-UserSessions ([string]$target["id"])
    }
    $script:Db.pristine = $false
    $payload = @{ ok = $true; message = $MsgSaved; user = (Public-User $target) }
    if ($passwordChanged -and [string]$actor["id"] -eq [string]$target["id"]) {
      $session = New-Session $target
      $payload.token = [string]$session["token"]
      $payload.exp = [int64]$session["exp"]
      $payload.user = Public-User $target
    }
    Save-Db
    Send-Json $Response 200 $payload
    return
  }
  if ($Path -eq "/api/auth/users/delete" -and $Request.HttpMethod -eq "POST") {
    $target = $null
    if ($body["id"]) { $target = Find-UserById ([string]$body["id"]) }
    elseif ($body["username"]) { $target = Find-UserByName ([string]$body["username"]) }
    if (-not $target) { Send-Error $Response 404 $MsgMissing; return }
    if ([string]$target["username"].Trim().ToLower() -eq "mohamed") { Send-Error $Response 400 $MsgNoPrimary; return }
    if ([string]$actor["id"] -eq [string]$target["id"]) { Send-Error $Response 400 $MsgNoSelfDelete; return }
    if ([string]$target["portalRole"] -eq "admin" -and (Count-OtherAdmins ([string]$target["id"])) -eq 0) {
      Send-Error $Response 400 $MsgNoLastAdmin; return
    }
    $username = [string]$target["username"]
    Remove-UserSessions ([string]$target["id"])
    $keep = New-Object System.Collections.ArrayList
    foreach ($user in @($script:Db.users)) {
      if ([string]$user["id"] -ne [string]$target["id"]) { [void]$keep.Add($user) }
    }
    $script:Db.users = $keep
    $script:Db.pristine = $false
    Save-Db
    Send-Json $Response 200 @{ ok = $true; message = $MsgDeleted; username = $username }
    return
  }
  if ($Path -eq "/api/auth/password" -and $Request.HttpMethod -eq "POST") {
    $target = Find-UserById ([string]$body["id"])
    if (-not $target) { Send-Error $Response 404 $MsgMissing; return }
    $password = [string]$body["password"]
    $pwError = Test-PortalPassword $password
    if ($pwError) { Send-Error $Response 400 $pwError; return }
    $target["password"] = $password
    $target["credVersion"] = [int]$target["credVersion"] + 1
    Remove-UserSessions ([string]$target["id"])
    $script:Db.pristine = $false
    $payload = @{ ok = $true; message = $MsgSaved; user = (Public-User $target) }
    if ([string]$actor["id"] -eq [string]$target["id"]) {
      $session = New-Session $target
      $payload.token = [string]$session["token"]
      $payload.exp = [int64]$session["exp"]
      $payload.user = Public-User $target
    }
    Save-Db
    Send-Json $Response 200 $payload
    return
  }
  if ($Path -eq "/api/auth/active" -and $Request.HttpMethod -eq "POST") {
    $target = Find-UserById ([string]$body["id"])
    if (-not $target) { Send-Error $Response 404 $MsgMissing; return }
    $active = $body["active"] -eq $true
    if (-not $active -and [string]$actor["id"] -eq [string]$target["id"]) { Send-Error $Response 400 $MsgNoSelfStop; return }
    if (-not $active -and [string]$target["portalRole"] -eq "admin" -and (Count-OtherAdmins ([string]$target["id"])) -eq 0) {
      Send-Error $Response 400 $MsgKeepAdmin; return
    }
    $target["active"] = $active
    if (-not $active) { Remove-UserSessions ([string]$target["id"]) }
    Save-Db
    $message = $(if ($active) { $MsgActivated } else { $MsgStopped })
    Send-Json $Response 200 @{ ok = $true; message = $message }
    return
  }

  Send-Error $Response 404 $MsgMissing
}

function Resolve-Static([string]$UrlPath) {
  $rel = [Uri]::UnescapeDataString($UrlPath.Split("?")[0])
  if ([string]::IsNullOrWhiteSpace($rel) -or $rel -eq "/") { $rel = "/index.html" }
  $rel = $rel.TrimStart("/")
  if ($rel.EndsWith("/")) { $rel = $rel + "index.html" }
  $full = [IO.Path]::GetFullPath((Join-Path $Root ($rel -replace "/", "\")))
  $rootFull = [IO.Path]::GetFullPath($Root)
  $dataFull = [IO.Path]::GetFullPath($DataDir)
  if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) { return $null }
  if ($full.StartsWith($dataFull, [StringComparison]::OrdinalIgnoreCase)) { return $null }
  if (-not (Test-Path $full -PathType Leaf)) {
    $index = Join-Path $full "index.html"
    if (Test-Path $index -PathType Leaf) { return [IO.Path]::GetFullPath($index) }
    return $null
  }
  return $full
}

Load-Db

$listener = New-Object System.Net.HttpListener
$boundAll = $false
try {
  $listener.Prefixes.Add("http://+:$Port/")
  $listener.Start()
  $boundAll = $true
} catch {
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$Port/")
  $listener.Prefixes.Add("http://127.0.0.1:$Port/")
  $listener.Start()
}

Write-Host ""
Write-Host "Rokn Wajd accounts are served from data\accounts.json"
Write-Host "Open http://localhost:$Port/"
if ($boundAll) {
  Write-Host "Other devices on this network can use this computer's address on port $Port."
} else {
  Write-Host "This window is reachable on this PC, including an Incognito window."
  Write-Host "For other devices, run PowerShell as Administrator once:"
  Write-Host "  netsh http add urlacl url=http://+:$Port/ user=$env:USERNAME"
  Write-Host "Then start this server again."
}
Write-Host "Press Ctrl+C to stop."
Write-Host ""

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    try {
      $path = $request.Url.AbsolutePath
      if ($path.StartsWith("/api/auth")) {
        Handle-Auth $request $response $path
      } else {
        $file = Resolve-Static $path
        if (-not $file) {
          $response.StatusCode = 404
          $bytes = [Text.Encoding]::UTF8.GetBytes("Not found")
          $response.ContentLength64 = $bytes.Length
          $response.OutputStream.Write($bytes, 0, $bytes.Length)
          $response.OutputStream.Close()
        } else {
          Send-File $response $file
        }
      }
    } catch {
      try { Send-Error $response 500 $_.Exception.Message } catch { try { $response.Abort() } catch {} }
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
