#!/usr/bin/env bash
#
# discover-context.sh
# Discovers project context directories and files for AI agents
# Supports: claude-spec, spec-kit (GitHub), get-shit-done (GSD)
#
# Usage: bash discover-context.sh [directory]
#        Default directory is current directory (.)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
ORANGE='\033[0;33m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Target directory (default to current)
TARGET_DIR="${1:-.}"

# Resolve to absolute path
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

# Counters
total_files=0
total_size=0

# Framework detection flags
has_claude_spec=false
has_spec_kit=false
has_gsd=false

# Function to format file size
format_size() {
    local size=$1
    if [ "$size" -lt 1024 ]; then
        echo "${size} B"
    elif [ "$size" -lt 1048576 ]; then
        echo "$(echo "scale=1; $size/1024" | bc) KB"
    else
        echo "$(echo "scale=1; $size/1048576" | bc) MB"
    fi
}

# Function to get file size
get_size() {
    local file="$1"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        stat -f%z "$file" 2>/dev/null || echo 0
    else
        stat -c%s "$file" 2>/dev/null || echo 0
    fi
}

# Function to check and report a file
check_file() {
    local file="$1"
    local desc="$2"
    local full_path="$TARGET_DIR/$file"

    if [ -f "$full_path" ]; then
        local size=$(get_size "$full_path")
        total_size=$((total_size + size))
        total_files=$((total_files + 1))
        echo -e "  ${GREEN}✓${NC} $file ($(format_size $size))"
        echo "    └── $desc"
        return 0
    else
        echo -e "  ${RED}✗${NC} $file (not found)"
        return 1
    fi
}

# Function to list directory contents recursively (limited depth)
list_dir_contents() {
    local dir="$1"
    local prefix="$2"
    local depth="${3:-0}"
    local max_depth=2

    if [ "$depth" -ge "$max_depth" ]; then
        local count=$(find "$dir" -type f 2>/dev/null | wc -l)
        if [ "$count" -gt 0 ]; then
            echo "${prefix}└── ... ($count more files)"
        fi
        return
    fi

    local items=()
    while IFS= read -r -d '' item; do
        items+=("$item")
    done < <(find "$dir" -maxdepth 1 -mindepth 1 -print0 2>/dev/null | sort -z)

    local count=${#items[@]}
    local i=0

    for item in "${items[@]}"; do
        i=$((i + 1))
        local name=$(basename "$item")
        local is_last=$((i == count))
        local connector="├──"
        local next_prefix="${prefix}│   "

        if [ "$is_last" -eq 1 ]; then
            connector="└──"
            next_prefix="${prefix}    "
        fi

        if [ -d "$item" ]; then
            echo "${prefix}${connector} ${name}/"
            list_dir_contents "$item" "$next_prefix" $((depth + 1))
        else
            local size=$(get_size "$item")
            total_size=$((total_size + size))
            total_files=$((total_files + 1))
            echo "${prefix}${connector} ${name} ($(format_size $size))"
        fi
    done
}

# Function to check and report a directory
check_dir() {
    local dir="$1"
    local desc="$2"
    local full_path="$TARGET_DIR/$dir"

    if [ -d "$full_path" ]; then
        echo -e "  ${GREEN}✓${NC} $dir/"
        echo "    └── $desc"
        list_dir_contents "$full_path" "    "
        return 0
    else
        echo -e "  ${RED}✗${NC} $dir/ (not found)"
        return 1
    fi
}

# ── Framework Detection ──────────────────────────────────────────────────────

detect_frameworks() {
    if [ -d "$TARGET_DIR/.project" ]; then
        has_claude_spec=true
    fi
    if [ -d "$TARGET_DIR/.specify" ] || [ -f "$TARGET_DIR/memory/constitution.md" ]; then
        has_spec_kit=true
    fi
    if [ -d "$TARGET_DIR/.planning" ] && [ -f "$TARGET_DIR/PROJECT.md" ]; then
        has_gsd=true
    fi
}

# ── Main output ──────────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}📂 Context Discovery Report${NC}"
echo "============================"
echo ""
echo "Scanning: $TARGET_DIR"
echo ""

# Detect frameworks
detect_frameworks

echo -e "${CYAN}🔍 Framework Detection:${NC}"
if $has_claude_spec; then
    echo -e "  ${GREEN}✓${NC} claude-spec (.project/ detected)"
fi
if $has_spec_kit; then
    echo -e "  ${GREEN}✓${NC} spec-kit (.specify/ or memory/constitution.md detected)"
fi
if $has_gsd; then
    echo -e "  ${GREEN}✓${NC} get-shit-done (.planning/ + PROJECT.md detected)"
fi
if ! $has_claude_spec && ! $has_spec_kit && ! $has_gsd; then
    echo -e "  ${YELLOW}○${NC} No spec framework detected (checking generic context)"
fi
echo ""

# ── Critical context ─────────────────────────────────────────────────────────

echo -e "${RED}🔴 Critical Context:${NC}"
critical_found=0

# Universal critical files
check_file "CLAUDE.md" "Root agent instructions and project conventions" && critical_found=$((critical_found + 1)) || true
check_file "AGENTS.md" "Agent definitions and capabilities" && critical_found=$((critical_found + 1)) || true
check_file "Agents.md" "Agent definitions and capabilities" && critical_found=$((critical_found + 1)) || true
check_file "agents.md" "Agent definitions and capabilities (lowercase)" && critical_found=$((critical_found + 1)) || true

# spec-kit governance
if [ -f "$TARGET_DIR/.specify/memory/constitution.md" ]; then
    check_file ".specify/memory/constitution.md" "spec-kit: Non-negotiable project principles" && critical_found=$((critical_found + 1)) || true
elif [ -f "$TARGET_DIR/memory/constitution.md" ]; then
    check_file "memory/constitution.md" "spec-kit (legacy): Project governance and principles" && critical_found=$((critical_found + 1)) || true
fi

# GSD governance
check_file "PROJECT.md" "GSD: Project vision, always loaded during sessions" && critical_found=$((critical_found + 1)) || true

check_dir ".claude" "Claude Code configuration, skills, and commands" && critical_found=$((critical_found + 1)) || true
echo ""

# ── High priority context ────────────────────────────────────────────────────

echo -e "${ORANGE}🟠 High Priority Context:${NC}"
high_found=0

# claude-spec
check_dir ".project" "claude-spec: Project metadata, features, and architecture" && high_found=$((high_found + 1)) || true

# spec-kit
check_dir ".specify" "spec-kit: Specs, memory, templates, and scripts" && high_found=$((high_found + 1)) || true
if [ ! -d "$TARGET_DIR/.specify" ]; then
    # Check legacy/root layout
    check_dir "memory" "spec-kit (legacy): Persistent context and constitution" && high_found=$((high_found + 1)) || true
    check_dir "specs" "spec-kit (legacy): Feature specifications" && high_found=$((high_found + 1)) || true
fi

# GSD
check_dir ".planning" "GSD: Planning state, research, plans, and summaries" && high_found=$((high_found + 1)) || true
check_file "REQUIREMENTS.md" "GSD: Scoped requirements with phase traceability" && high_found=$((high_found + 1)) || true
check_file "ROADMAP.md" "Roadmap: Milestone phases and completion status" && high_found=$((high_found + 1)) || true
check_file "STATE.md" "State: Decisions, blockers, position across sessions" && high_found=$((high_found + 1)) || true
check_file "HANDOFF.md" "GSD: Session transition context" && high_found=$((high_found + 1)) || true

# Generic
check_dir "planning" "Planning documents (generic)" && high_found=$((high_found + 1)) || true
echo ""

# ── Medium priority context ──────────────────────────────────────────────────

echo -e "${YELLOW}🟡 Medium Priority Context:${NC}"
medium_found=0
check_dir "spec" "Feature specifications and requirements" && medium_found=$((medium_found + 1)) || true
check_dir "docs" "General project documentation" && medium_found=$((medium_found + 1)) || true
check_dir "documentation" "Documentation (alternative)" && medium_found=$((medium_found + 1)) || true
check_dir "templates" "Document and command templates" && medium_found=$((medium_found + 1)) || true
check_dir "scripts" "Automation and utility scripts" && medium_found=$((medium_found + 1)) || true
echo ""

# ── Low priority context ─────────────────────────────────────────────────────

echo -e "${GREEN}🟢 Low Priority Context:${NC}"
low_found=0
check_file "README.md" "Project overview and getting started" && low_found=$((low_found + 1)) || true
check_file "readme.md" "Project overview (lowercase)" && low_found=$((low_found + 1)) || true
check_file "CONTRIBUTING.md" "Contribution guidelines" && low_found=$((low_found + 1)) || true
check_file "ARCHITECTURE.md" "Architecture documentation" && low_found=$((low_found + 1)) || true
check_file "CHANGELOG.md" "Version history" && low_found=$((low_found + 1)) || true
check_dir ".github" "GitHub workflows, templates, and CI/CD" && low_found=$((low_found + 1)) || true
check_dir ".gitlab" "GitLab CI configuration" && low_found=$((low_found + 1)) || true
check_dir ".vscode" "VS Code settings and tasks" && low_found=$((low_found + 1)) || true
echo ""

# ── Summary ──────────────────────────────────────────────────────────────────

echo "============================"
echo -e "${BLUE}📊 Summary${NC}"
echo ""
echo "Total context files found: $total_files"
echo "Total context size: $(format_size $total_size)"
echo ""

# Detected frameworks summary
frameworks=""
if $has_claude_spec; then frameworks="claude-spec"; fi
if $has_spec_kit; then
    if [ -n "$frameworks" ]; then frameworks="$frameworks, "; fi
    frameworks="${frameworks}spec-kit"
fi
if $has_gsd; then
    if [ -n "$frameworks" ]; then frameworks="$frameworks, "; fi
    frameworks="${frameworks}get-shit-done"
fi
if [ -z "$frameworks" ]; then frameworks="none detected"; fi
echo "Frameworks detected: $frameworks"
echo ""

# ── Recommendations ──────────────────────────────────────────────────────────

echo -e "${BLUE}📋 Recommended Reading Order:${NC}"
order=1
if [ -f "$TARGET_DIR/CLAUDE.md" ]; then
    echo "  $order. CLAUDE.md (conventions and instructions)"
    order=$((order + 1))
fi
if [ -f "$TARGET_DIR/AGENTS.md" ] || [ -f "$TARGET_DIR/Agents.md" ] || [ -f "$TARGET_DIR/agents.md" ]; then
    echo "  $order. AGENTS.md (available agents)"
    order=$((order + 1))
fi

# Framework-specific governance
if [ -f "$TARGET_DIR/.specify/memory/constitution.md" ]; then
    echo "  $order. .specify/memory/constitution.md (spec-kit governance)"
    order=$((order + 1))
elif [ -f "$TARGET_DIR/memory/constitution.md" ]; then
    echo "  $order. memory/constitution.md (spec-kit governance)"
    order=$((order + 1))
fi
if [ -f "$TARGET_DIR/PROJECT.md" ]; then
    echo "  $order. PROJECT.md (GSD project vision)"
    order=$((order + 1))
fi

# Planning state
if [ -d "$TARGET_DIR/.project" ]; then
    echo "  $order. .project/ (claude-spec architecture and features)"
    order=$((order + 1))
fi
if [ -d "$TARGET_DIR/.specify" ]; then
    echo "  $order. .specify/ (spec-kit specs and memory)"
    order=$((order + 1))
fi
if [ -f "$TARGET_DIR/STATE.md" ]; then
    echo "  $order. STATE.md (current state and decisions)"
    order=$((order + 1))
fi
if [ -d "$TARGET_DIR/.planning" ] || [ -d "$TARGET_DIR/planning" ]; then
    echo "  $order. .planning/ (planning state and plans)"
    order=$((order + 1))
fi
if [ -d "$TARGET_DIR/spec" ] || [ -d "$TARGET_DIR/specs" ]; then
    echo "  $order. spec/ (feature specifications)"
    order=$((order + 1))
fi
if [ -f "$TARGET_DIR/README.md" ] || [ -f "$TARGET_DIR/readme.md" ]; then
    echo "  $order. README.md (project overview)"
    order=$((order + 1))
fi
echo ""

# Warnings
if [ "$critical_found" -eq 0 ]; then
    echo -e "${RED}⚠️  Warning: No critical context found!${NC}"
    echo "   Consider creating CLAUDE.md with project conventions."
    echo ""
fi
