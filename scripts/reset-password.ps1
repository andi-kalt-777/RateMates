# Passwort eines RateMates-Kontos zuruecksetzen (Admin-Weg, laeuft nur lokal).
#
# Die App kann keine Reset-Mails verschicken, weil die Anmeldung technische Adressen
# nutzt. Stattdessen wird das Konto auf den "alten" Stand zurueckgesetzt (nur pwHash,
# keine uid). Beim naechsten Login zieht es automatisch wieder zu Firebase Auth um.
#
# Voraussetzung: Firebase CLI installiert und angemeldet (firebase login).
# Ablauf: siehe README, Abschnitt "Passwort vergessen".
#
#   powershell -ExecutionPolicy Bypass -File scripts/reset-password.ps1 -Name "Jupp"

param([Parameter(Mandatory = $true)][string]$Name)

$Project  = "montagabendrestaurants"
$Instance = "montagabendrestaurants-default-rtdb"

function Unwrap([securestring]$s) {
  $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
}

# 1. Konto pruefen
$raw = firebase database:get "/users/$Name" --project $Project --instance $Instance 2>$null
if (-not $raw -or $raw -eq "null") {
  Write-Host "Kein Konto '$Name' in der Datenbank gefunden (Gross-/Kleinschreibung beachten)." -ForegroundColor Red
  exit 1
}
$user = $raw | ConvertFrom-Json

# 2. Bereits umgezogenes Konto: Firebase-Auth-Nutzer muss vorher in der Konsole weg
if ($user.uid) {
  $email = ($Name.Trim().ToLowerInvariant() -replace " ", ".") + "@ratemates.invalid"
  Write-Host ""
  Write-Host "Das Konto '$Name' ist bereits auf Firebase Auth umgezogen." -ForegroundColor Yellow
  Write-Host "Loesche zuerst in der Firebase-Konsole unter Authentication > Nutzer den Eintrag:"
  Write-Host "    $email" -ForegroundColor Cyan
  Write-Host "https://console.firebase.google.com/project/$Project/authentication/users"
  $ok = Read-Host "Ist der Nutzer in der Konsole geloescht? (j/n)"
  if ($ok -ne "j") { Write-Host "Abgebrochen."; exit 1 }
  firebase database:remove "/uids/$($user.uid)" --project $Project --instance $Instance --force | Out-Null
  firebase database:remove "/users/$Name/uid" --project $Project --instance $Instance --force | Out-Null
  Write-Host "uid-Verknuepfung entfernt."
}

# 3. Startpasswort abfragen und Hash schreiben (gleiche Formel wie hashPw() in index.html)
$pw  = Unwrap (Read-Host "Startpasswort fuer '$Name' (min. 6 Zeichen)" -AsSecureString)
$pw2 = Unwrap (Read-Host "Noch einmal wiederholen" -AsSecureString)
if ($pw.Length -lt 6) { Write-Host "Zu kurz, mindestens 6 Zeichen." -ForegroundColor Red; exit 1 }
if ($pw -cne $pw2)    { Write-Host "Die Eingaben stimmen nicht ueberein." -ForegroundColor Red; exit 1 }

$bytes = [Text.Encoding]::UTF8.GetBytes($Name.ToLowerInvariant() + ":" + $pw)
$hash  = ([Security.Cryptography.SHA256]::Create().ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") }) -join ""
$pw = $null; $pw2 = $null

$tmp = [IO.Path]::GetTempFileName()
[IO.File]::WriteAllText($tmp, '"' + $hash + '"')
try {
  firebase database:set "/users/$Name/pwHash" $tmp --project $Project --instance $Instance --force | Out-Null
} finally { Remove-Item $tmp -Force }

Write-Host ""
Write-Host "Fertig. '$Name' meldet sich jetzt mit dem Startpasswort an und aendert es danach in der App." -ForegroundColor Green
