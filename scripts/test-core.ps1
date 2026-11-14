$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
    $cargo = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
    if (-not (Test-Path -LiteralPath $cargo)) { throw 'Install Rust with rustup before running this script.' }
    $toolchain = @()
    if (-not (Get-Command link.exe -ErrorAction SilentlyContinue)) {
        $llvmRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
        $llvmPackage = Get-ChildItem -LiteralPath $llvmRoot -Directory -ErrorAction SilentlyContinue |
            Where-Object Name -Like 'MartinStorsjo.LLVM-MinGW.UCRT*' | Select-Object -First 1
        if ($llvmPackage) {
            $clang = Get-ChildItem -LiteralPath $llvmPackage.FullName -Filter clang.exe -Recurse | Select-Object -First 1
            if ($clang) { $env:PATH = "$($clang.DirectoryName);$env:PATH" }
        }
        $toolchain = @('+1.92.0-x86_64-pc-windows-gnullvm')
    }
    & $cargo @toolchain fmt --all -- --check
    if ($LASTEXITCODE -ne 0) { throw 'Rust format check failed.' }
    & $cargo @toolchain test --workspace --locked -j 1
    if ($LASTEXITCODE -ne 0) { throw 'Rust tests failed.' }
    & $cargo @toolchain clippy --workspace --all-targets --locked -j 1 -- -D warnings
    if ($LASTEXITCODE -ne 0) { throw 'Rust lint failed.' }
} finally {
    Pop-Location
}
