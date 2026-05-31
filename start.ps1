$root = $PSScriptRoot

# 1. Iniciar Docker Desktop se nao estiver rodando
$docker = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
if (-not $docker) {
    Write-Host "Iniciando Docker Desktop..."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -WindowStyle Hidden
}

# 2. Aguardar Docker ficar pronto
Write-Host "Aguardando Docker inicializar..."
$timeout = 120
$elapsed = 0
do {
    Start-Sleep -Seconds 3
    $elapsed += 3
    $ready = (docker info 2>$null) -ne $null
} while (-not $ready -and $elapsed -lt $timeout)

if (-not $ready) {
    Write-Host "Docker nao iniciou a tempo. Verifique o Docker Desktop e tente novamente."
    exit 1
}

Write-Host "Docker pronto."
Start-Sleep -Seconds 5

# 3. Subir Supabase local (preserva dados)
Write-Host "Iniciando Supabase..."
Push-Location $root
supabase start
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao iniciar Supabase. Verifique o Docker e tente novamente."
    Pop-Location
    exit 1
}
Pop-Location

# 4. Garantir que o admin existe
Write-Host "Verificando usuario admin..."
Push-Location "$root\server"
npm run seed:admin 2>$null
Pop-Location

# 5. Subir backend e frontend
Write-Host "Iniciando backend e frontend..."
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$root\server'; npm run dev"
Start-Sleep -Seconds 3
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$root\client'; npm start"
