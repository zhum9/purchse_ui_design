<#
.SYNOPSIS
Safely triggers the repository's GitHub Pages workflow for the current main commit.

.DESCRIPTION
Does not commit or push changes. Requires a clean main branch synchronized with origin/main,
pnpm, GitHub CLI authentication, and (unless -SkipBuild is used) a successful local Pages build.

.EXAMPLE
.\scripts\publish-pages.ps1

.EXAMPLE
.\scripts\publish-pages.ps1 -NoWait
#>
param(
    [switch]$SkipBuild,
    [switch]$NoWait
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$expectedRepository = 'zhum9/purchse_ui_design'
$workflowFile = 'deploy-pages.yml'

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "命令执行失败（退出码 $LASTEXITCODE）：$Executable $($Arguments -join ' ')"
    }
}

function Get-CheckedOutput {
    param(
        [Parameter(Mandatory = $true)][string]$Executable,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    $output = & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "命令执行失败（退出码 $LASTEXITCODE）：$Executable $($Arguments -join ' ')"
    }
    return ($output -join [Environment]::NewLine).Trim()
}

function Restore-EnvironmentVariable {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [AllowNull()][string]$Value
    )

    if ($null -eq $Value) {
        Remove-Item -Path "Env:$Name" -ErrorAction SilentlyContinue
    }
    else {
        Set-Item -Path "Env:$Name" -Value $Value
    }
}

Push-Location $repoRoot
try {
    $git = Get-Command git -ErrorAction SilentlyContinue
    if (-not $git) {
        throw '未找到 Git，请先安装 Git 并确保它已加入 PATH。'
    }

    $currentBranch = Get-CheckedOutput -Executable $git.Source -Arguments @('branch', '--show-current')
    if ($currentBranch -ne 'main') {
        throw "当前分支是 '$currentBranch'。请切换到 main，并在 main 上发布。"
    }

    $changes = Get-CheckedOutput -Executable $git.Source -Arguments @('status', '--porcelain')
    if ($changes) {
        Write-Host '工作区存在未提交或未跟踪文件；为避免把旧版 main 误认为当前改动已发布，已停止。' -ForegroundColor Yellow
        Write-Host $changes
        throw '请先按你的发布流程提交并推送需要发布的改动，再重新运行此脚本。'
    }

    $originUrl = Get-CheckedOutput -Executable $git.Source -Arguments @('remote', 'get-url', 'origin')
    if ($originUrl -notmatch 'github\.com[:/]([^/]+/[^/]+?)(?:\.git)?$' -or $Matches[1] -ne $expectedRepository) {
        throw "origin 不是预期仓库 $expectedRepository：$originUrl"
    }

    Write-Host '正在核对 GitHub 上的 main 分支…'
    Invoke-Checked -Executable $git.Source -Arguments @('fetch', 'origin', 'main:refs/remotes/origin/main')
    $localCommit = Get-CheckedOutput -Executable $git.Source -Arguments @('rev-parse', 'HEAD')
    $remoteCommit = Get-CheckedOutput -Executable $git.Source -Arguments @('rev-parse', 'origin/main')
    if ($localCommit -ne $remoteCommit) {
        throw "本地 main（$localCommit）与 origin/main（$remoteCommit）不一致。请先完成同步，再运行发布脚本。"
    }

    $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
    $gh = Get-Command gh -ErrorAction SilentlyContinue
    if (-not $pnpm) {
        throw '未找到 pnpm。请先按项目说明安装 pnpm。'
    }
    if (-not $gh) {
        throw '未找到 GitHub CLI（gh）。请安装 GitHub CLI 后重新运行。'
    }

    Invoke-Checked -Executable $gh.Source -Arguments @('auth', 'status', '--hostname', 'github.com')

    if (-not $SkipBuild) {
        Write-Host '正在按 GitHub Pages 工作流配置执行构建预检…'
        $previousBasePath = $env:VITE_BASE_PATH
        $previousEnableMocks = $env:VITE_ENABLE_MOCKS
        try {
            $env:VITE_BASE_PATH = './'
            $env:VITE_ENABLE_MOCKS = 'true'
            Invoke-Checked -Executable $pnpm.Source -Arguments @('install', '--frozen-lockfile')
            Invoke-Checked -Executable $pnpm.Source -Arguments @('build')
        }
        finally {
            Restore-EnvironmentVariable -Name 'VITE_BASE_PATH' -Value $previousBasePath
            Restore-EnvironmentVariable -Name 'VITE_ENABLE_MOCKS' -Value $previousEnableMocks
        }
    }

    Write-Host "即将手动触发 $expectedRepository 的 GitHub Pages 部署。"
    Write-Host "发布来源：main @ $localCommit"
    Write-Host '此操作不会提交、推送代码，也不会修改 DNS 或 Pages 设置。'
    $confirmation = Read-Host '确认触发部署？输入 y 继续；直接回车取消'
    if ($confirmation -notmatch '^(y|yes)$') {
        Write-Host '已取消，没有触发部署。'
        return
    }

    $dispatchStartedAt = [DateTimeOffset]::UtcNow
    Invoke-Checked -Executable $gh.Source -Arguments @('workflow', 'run', $workflowFile, '--ref', 'main', '--repo', $expectedRepository)
    Write-Host '已提交手动部署请求。'

    if ($NoWait) {
        Write-Host "可在 GitHub Actions 查看工作流：https://github.com/$expectedRepository/actions/workflows/$workflowFile"
        return
    }

    Write-Host '正在等待 GitHub Actions 创建本次运行…'
    $runId = $null
    for ($attempt = 0; $attempt -lt 30 -and -not $runId; $attempt++) {
        Start-Sleep -Seconds 2
        $runsJson = Get-CheckedOutput -Executable $gh.Source -Arguments @(
            'run', 'list',
            '--workflow', $workflowFile,
            '--branch', 'main',
            '--event', 'workflow_dispatch',
            '--limit', '10',
            '--json', 'databaseId,event,headSha,url,createdAt'
        )
        $runs = @($runsJson | ConvertFrom-Json)
        $matchingRun = $runs |
            Where-Object {
                $_.event -eq 'workflow_dispatch' -and
                $_.headSha -eq $localCommit -and
                ([DateTimeOffset]::Parse($_.createdAt).ToUniversalTime() -ge $dispatchStartedAt.AddSeconds(-5))
            } |
            Sort-Object { [DateTimeOffset]::Parse($_.createdAt) } -Descending |
            Select-Object -First 1
        if ($matchingRun) {
            $runId = [string]$matchingRun.databaseId
            Write-Host "本次运行已创建：$($matchingRun.url)"
        }
    }

    if (-not $runId) {
        throw "已触发工作流，但暂时没有查到对应运行。请检查：https://github.com/$expectedRepository/actions/workflows/$workflowFile"
    }

    Invoke-Checked -Executable $gh.Source -Arguments @('run', 'watch', $runId, '--exit-status')
    Write-Host 'GitHub Pages 部署工作流已成功完成。'
}
finally {
    Pop-Location
}
