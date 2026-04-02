#
# discover-context.ps1
# Discovers project context directories and files for AI agents
# Supports: claude-spec, spec-kit (GitHub), get-shit-done (GSD)
#
# Usage: powershell -File discover-context.ps1 [directory]
#        Default directory is current directory (.)

param(
    [string]$TargetDir = "."
)

# Resolve to absolute path
$TargetDir = Resolve-Path $TargetDir -ErrorAction SilentlyContinue
if (-not $TargetDir) {
    Write-Host "Error: Directory not found" -ForegroundColor Red
    exit 1
}

# Counters
$script:totalFiles = 0
$script:totalSize = 0

# Framework detection flags
$script:hasClaudeSpec = $false
$script:hasSpecKit = $false
$script:hasGSD = $false

# Function to format file size
function Format-FileSize {
    param([long]$Size)

    if ($Size -lt 1024) {
        return "$Size B"
    }
    elseif ($Size -lt 1048576) {
        return "{0:N1} KB" -f ($Size / 1024)
    }
    else {
        return "{0:N1} MB" -f ($Size / 1048576)
    }
}

# Function to check and report a file
function Test-ContextFile {
    param(
        [string]$FileName,
        [string]$Description
    )

    $fullPath = Join-Path $TargetDir $FileName

    if (Test-Path $fullPath -PathType Leaf) {
        $fileInfo = Get-Item $fullPath
        $script:totalSize += $fileInfo.Length
        $script:totalFiles++

        Write-Host "  " -NoNewline
        Write-Host "+" -ForegroundColor Green -NoNewline
        Write-Host " $FileName ($(Format-FileSize $fileInfo.Length))"
        Write-Host "    --- $Description" -ForegroundColor DarkGray
        return $true
    }
    else {
        Write-Host "  " -NoNewline
        Write-Host "x" -ForegroundColor Red -NoNewline
        Write-Host " $FileName (not found)"
        return $false
    }
}

# Function to list directory contents recursively (limited depth)
function Show-DirectoryContents {
    param(
        [string]$Directory,
        [string]$Prefix = "    ",
        [int]$Depth = 0,
        [int]$MaxDepth = 2
    )

    if ($Depth -ge $MaxDepth) {
        $count = (Get-ChildItem -Path $Directory -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        if ($count -gt 0) {
            Write-Host "${Prefix}--- ... ($count more files)" -ForegroundColor DarkGray
        }
        return
    }

    $items = Get-ChildItem -Path $Directory -ErrorAction SilentlyContinue | Sort-Object { -not $_.PSIsContainer }, Name
    $count = ($items | Measure-Object).Count
    $i = 0

    foreach ($item in $items) {
        $i++
        $isLast = ($i -eq $count)
        $connector = if ($isLast) { "---" } else { "|--" }
        $nextPrefix = if ($isLast) { "${Prefix}    " } else { "${Prefix}|   " }

        if ($item.PSIsContainer) {
            Write-Host "${Prefix}${connector} $($item.Name)/" -ForegroundColor DarkGray
            Show-DirectoryContents -Directory $item.FullName -Prefix $nextPrefix -Depth ($Depth + 1) -MaxDepth $MaxDepth
        }
        else {
            $script:totalSize += $item.Length
            $script:totalFiles++
            Write-Host "${Prefix}${connector} $($item.Name) ($(Format-FileSize $item.Length))" -ForegroundColor DarkGray
        }
    }
}

# Function to check and report a directory
function Test-ContextDirectory {
    param(
        [string]$DirName,
        [string]$Description
    )

    $fullPath = Join-Path $TargetDir $DirName

    if (Test-Path $fullPath -PathType Container) {
        Write-Host "  " -NoNewline
        Write-Host "+" -ForegroundColor Green -NoNewline
        Write-Host " $DirName/"
        Write-Host "    --- $Description" -ForegroundColor DarkGray
        Show-DirectoryContents -Directory $fullPath
        return $true
    }
    else {
        Write-Host "  " -NoNewline
        Write-Host "x" -ForegroundColor Red -NoNewline
        Write-Host " $DirName/ (not found)"
        return $false
    }
}

# ── Framework Detection ──────────────────────────────────────────────────────

function Detect-Frameworks {
    if (Test-Path (Join-Path $TargetDir ".project") -PathType Container) {
        $script:hasClaudeSpec = $true
    }
    if ((Test-Path (Join-Path $TargetDir ".specify") -PathType Container) -or
        (Test-Path (Join-Path $TargetDir "memory/constitution.md") -PathType Leaf)) {
        $script:hasSpecKit = $true
    }
    if ((Test-Path (Join-Path $TargetDir ".planning") -PathType Container) -and
        (Test-Path (Join-Path $TargetDir "PROJECT.md") -PathType Leaf)) {
        $script:hasGSD = $true
    }
}

# ── Main output ──────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "Context Discovery Report" -ForegroundColor Blue
Write-Host "============================"
Write-Host ""
Write-Host "Scanning: $TargetDir"
Write-Host ""

# Detect frameworks
Detect-Frameworks

Write-Host "Framework Detection:" -ForegroundColor Cyan
if ($script:hasClaudeSpec) {
    Write-Host "  " -NoNewline; Write-Host "+" -ForegroundColor Green -NoNewline; Write-Host " claude-spec (.project/ detected)"
}
if ($script:hasSpecKit) {
    Write-Host "  " -NoNewline; Write-Host "+" -ForegroundColor Green -NoNewline; Write-Host " spec-kit (.specify/ or memory/constitution.md detected)"
}
if ($script:hasGSD) {
    Write-Host "  " -NoNewline; Write-Host "+" -ForegroundColor Green -NoNewline; Write-Host " get-shit-done (.planning/ + PROJECT.md detected)"
}
if (-not $script:hasClaudeSpec -and -not $script:hasSpecKit -and -not $script:hasGSD) {
    Write-Host "  o No spec framework detected (checking generic context)" -ForegroundColor Yellow
}
Write-Host ""

# ── Critical context ─────────────────────────────────────────────────────────

Write-Host "CRITICAL Context:" -ForegroundColor Red
$criticalFound = 0

# Universal critical files
if (Test-ContextFile -FileName "CLAUDE.md" -Description "Root agent instructions and project conventions") { $criticalFound++ }
if (Test-ContextFile -FileName "AGENTS.md" -Description "Agent definitions and capabilities") { $criticalFound++ }
if (Test-ContextFile -FileName "Agents.md" -Description "Agent definitions and capabilities") { $criticalFound++ }
if (Test-ContextFile -FileName "agents.md" -Description "Agent definitions and capabilities (lowercase)") { $criticalFound++ }

# spec-kit governance
$specifyConst = Join-Path $TargetDir ".specify/memory/constitution.md"
$memoryConst = Join-Path $TargetDir "memory/constitution.md"
if (Test-Path $specifyConst -PathType Leaf) {
    if (Test-ContextFile -FileName ".specify/memory/constitution.md" -Description "spec-kit: Non-negotiable project principles") { $criticalFound++ }
} elseif (Test-Path $memoryConst -PathType Leaf) {
    if (Test-ContextFile -FileName "memory/constitution.md" -Description "spec-kit (legacy): Project governance and principles") { $criticalFound++ }
}

# GSD governance
if (Test-ContextFile -FileName "PROJECT.md" -Description "GSD: Project vision, always loaded during sessions") { $criticalFound++ }

if (Test-ContextDirectory -DirName ".claude" -Description "Claude Code configuration, skills, and commands") { $criticalFound++ }
Write-Host ""

# ── High priority context ────────────────────────────────────────────────────

Write-Host "HIGH Priority Context:" -ForegroundColor Yellow
$highFound = 0

# claude-spec
if (Test-ContextDirectory -DirName ".project" -Description "claude-spec: Project metadata, features, and architecture") { $highFound++ }

# spec-kit
if (Test-ContextDirectory -DirName ".specify" -Description "spec-kit: Specs, memory, templates, and scripts") { $highFound++ }
if (-not (Test-Path (Join-Path $TargetDir ".specify") -PathType Container)) {
    if (Test-ContextDirectory -DirName "memory" -Description "spec-kit (legacy): Persistent context and constitution") { $highFound++ }
    if (Test-ContextDirectory -DirName "specs" -Description "spec-kit (legacy): Feature specifications") { $highFound++ }
}

# GSD
if (Test-ContextDirectory -DirName ".planning" -Description "GSD: Planning state, research, plans, and summaries") { $highFound++ }
if (Test-ContextFile -FileName "REQUIREMENTS.md" -Description "GSD: Scoped requirements with phase traceability") { $highFound++ }
if (Test-ContextFile -FileName "ROADMAP.md" -Description "Roadmap: Milestone phases and completion status") { $highFound++ }
if (Test-ContextFile -FileName "STATE.md" -Description "State: Decisions, blockers, position across sessions") { $highFound++ }
if (Test-ContextFile -FileName "HANDOFF.md" -Description "GSD: Session transition context") { $highFound++ }

# Generic
if (Test-ContextDirectory -DirName "planning" -Description "Planning documents (generic)") { $highFound++ }
Write-Host ""

# ── Medium priority context ──────────────────────────────────────────────────

Write-Host "MEDIUM Priority Context:" -ForegroundColor DarkYellow
$mediumFound = 0
if (Test-ContextDirectory -DirName "spec" -Description "Feature specifications and requirements") { $mediumFound++ }
if (Test-ContextDirectory -DirName "docs" -Description "General project documentation") { $mediumFound++ }
if (Test-ContextDirectory -DirName "documentation" -Description "Documentation (alternative)") { $mediumFound++ }
if (Test-ContextDirectory -DirName "templates" -Description "Document and command templates") { $mediumFound++ }
if (Test-ContextDirectory -DirName "scripts" -Description "Automation and utility scripts") { $mediumFound++ }
Write-Host ""

# ── Low priority context ─────────────────────────────────────────────────────

Write-Host "LOW Priority Context:" -ForegroundColor Green
$lowFound = 0
if (Test-ContextFile -FileName "README.md" -Description "Project overview and getting started") { $lowFound++ }
if (Test-ContextFile -FileName "readme.md" -Description "Project overview (lowercase)") { $lowFound++ }
if (Test-ContextFile -FileName "CONTRIBUTING.md" -Description "Contribution guidelines") { $lowFound++ }
if (Test-ContextFile -FileName "ARCHITECTURE.md" -Description "Architecture documentation") { $lowFound++ }
if (Test-ContextFile -FileName "CHANGELOG.md" -Description "Version history") { $lowFound++ }
if (Test-ContextDirectory -DirName ".github" -Description "GitHub workflows, templates, and CI/CD") { $lowFound++ }
if (Test-ContextDirectory -DirName ".gitlab" -Description "GitLab CI configuration") { $lowFound++ }
if (Test-ContextDirectory -DirName ".vscode" -Description "VS Code settings and tasks") { $lowFound++ }
Write-Host ""

# ── Summary ──────────────────────────────────────────────────────────────────

Write-Host "============================"
Write-Host "Summary" -ForegroundColor Blue
Write-Host ""
Write-Host "Total context files found: $script:totalFiles"
Write-Host "Total context size: $(Format-FileSize $script:totalSize)"
Write-Host ""

# Detected frameworks summary
$frameworks = @()
if ($script:hasClaudeSpec) { $frameworks += "claude-spec" }
if ($script:hasSpecKit) { $frameworks += "spec-kit" }
if ($script:hasGSD) { $frameworks += "get-shit-done" }
if ($frameworks.Count -eq 0) { $frameworksStr = "none detected" } else { $frameworksStr = $frameworks -join ", " }
Write-Host "Frameworks detected: $frameworksStr"
Write-Host ""

# ── Recommendations ──────────────────────────────────────────────────────────

Write-Host "Recommended Reading Order:" -ForegroundColor Blue
$order = 1

if (Test-Path (Join-Path $TargetDir "CLAUDE.md") -PathType Leaf) {
    Write-Host "  $order. CLAUDE.md (conventions and instructions)"
    $order++
}
if ((Test-Path (Join-Path $TargetDir "AGENTS.md") -PathType Leaf) -or
    (Test-Path (Join-Path $TargetDir "Agents.md") -PathType Leaf) -or
    (Test-Path (Join-Path $TargetDir "agents.md") -PathType Leaf)) {
    Write-Host "  $order. AGENTS.md (available agents)"
    $order++
}

# Framework-specific governance
if (Test-Path (Join-Path $TargetDir ".specify/memory/constitution.md") -PathType Leaf) {
    Write-Host "  $order. .specify/memory/constitution.md (spec-kit governance)"
    $order++
} elseif (Test-Path (Join-Path $TargetDir "memory/constitution.md") -PathType Leaf) {
    Write-Host "  $order. memory/constitution.md (spec-kit governance)"
    $order++
}
if (Test-Path (Join-Path $TargetDir "PROJECT.md") -PathType Leaf) {
    Write-Host "  $order. PROJECT.md (GSD project vision)"
    $order++
}

# Planning state
if (Test-Path (Join-Path $TargetDir ".project") -PathType Container) {
    Write-Host "  $order. .project/ (claude-spec architecture and features)"
    $order++
}
if (Test-Path (Join-Path $TargetDir ".specify") -PathType Container) {
    Write-Host "  $order. .specify/ (spec-kit specs and memory)"
    $order++
}
if (Test-Path (Join-Path $TargetDir "STATE.md") -PathType Leaf) {
    Write-Host "  $order. STATE.md (current state and decisions)"
    $order++
}
if ((Test-Path (Join-Path $TargetDir ".planning") -PathType Container) -or
    (Test-Path (Join-Path $TargetDir "planning") -PathType Container)) {
    Write-Host "  $order. .planning/ (planning state and plans)"
    $order++
}
if ((Test-Path (Join-Path $TargetDir "spec") -PathType Container) -or
    (Test-Path (Join-Path $TargetDir "specs") -PathType Container)) {
    Write-Host "  $order. spec/ (feature specifications)"
    $order++
}
if ((Test-Path (Join-Path $TargetDir "README.md") -PathType Leaf) -or
    (Test-Path (Join-Path $TargetDir "readme.md") -PathType Leaf)) {
    Write-Host "  $order. README.md (project overview)"
    $order++
}
Write-Host ""

# Warnings
if ($criticalFound -eq 0) {
    Write-Host "Warning: No critical context found!" -ForegroundColor Red
    Write-Host "   Consider creating CLAUDE.md with project conventions."
    Write-Host ""
}
