#!/usr/bin/env node
// Claude Code Statusline Hook
// Displays: model | current task | directory | context usage bar
// Reads JSON from stdin with model, workspace, session, and context window data

const fs = require('fs');
const path = require('path');
const os = require('os');

// ANSI escape codes
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const ORANGE = '\x1b[38;5;208m';
const RED = '\x1b[31m';
const BLINK = '\x1b[5m';

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
  });
}

function findCurrentTask(sessionId) {
  if (!sessionId) return '';

  const todosDir = path.join(os.homedir(), '.claude', 'todos');

  if (!fs.existsSync(todosDir)) return '';

  try {
    const files = fs.readdirSync(todosDir);

    // Look for todo files matching session ID (prefer -agent- files first)
    const matchingFiles = files
      .filter((f) => f.includes(sessionId) && f.endsWith('.json'))
      .sort((a, b) => {
        // Prioritize files with -agent- in the name
        const aHasAgent = a.includes('-agent-');
        const bHasAgent = b.includes('-agent-');
        if (aHasAgent && !bHasAgent) return -1;
        if (!aHasAgent && bHasAgent) return 1;
        return 0;
      });

    for (const file of matchingFiles) {
      const filePath = path.join(todosDir, file);
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const inProgressTask = content.todos?.find(
          (t) => t.status === 'in_progress'
        );
        if (inProgressTask?.activeForm) {
          return inProgressTask.activeForm;
        }
      } catch {
        // Skip files that can't be parsed
      }
    }
  } catch {
    // Directory read error
  }

  return '';
}

function buildProgressBar(used, total) {
  const percent = total > 0 ? Math.floor((used * 100) / total) : 0;
  const filled = Math.floor(percent / 10);
  const empty = 10 - filled;

  // Determine color based on usage
  let barColor;
  let indicator = '';

  if (percent < 50) {
    barColor = GREEN;
  } else if (percent < 65) {
    barColor = YELLOW;
  } else if (percent < 80) {
    barColor = ORANGE;
  } else {
    barColor = RED + BLINK;
    indicator = ' 💀';
  }

  const bar =
    barColor +
    '[' +
    '='.repeat(filled) +
    '-'.repeat(empty) +
    ']' +
    RESET +
    indicator;

  return { bar, percent };
}

async function main() {
  const input = await readStdin();

  let data;
  try {
    data = JSON.parse(input);
  } catch {
    // Exit silently on parse errors
    process.exit(0);
  }

  // Extract values using correct JSON paths per Claude Code documentation
  const model = data.model?.display_name || data.model?.id || '';
  const workspace = data.workspace?.current_dir || '';
  const sessionId = data.session_id || '';
  
  // Context window - use pre-calculated percentage
  const contextPercent = data.context_window?.used_percentage || 0;

  // Exit silently if no useful data
  if (!model && !workspace) {
    process.exit(0);
  }

  // Get directory basename
  const dirName = workspace ? path.basename(workspace) : '';

  // Find current task
  const currentTask = findCurrentTask(sessionId);

  // Build context progress bar (use pre-calculated percentage)
  const { bar, percent } = buildProgressBar(contextPercent, 100);

  // Build output
  const parts = [];

  // Model (dim)
  if (model) {
    parts.push(`${DIM}${model}${RESET}`);
  }

  // Current task (bold)
  if (currentTask) {
    parts.push(`${BOLD}${currentTask}${RESET}`);
  }

  // Directory
  if (dirName) {
    parts.push(dirName);
  }

  // Context bar
  parts.push(`${bar} ${percent}%`);

  console.log(parts.join(' | '));
}

main();
