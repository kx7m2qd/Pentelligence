import { execa } from 'execa';
import { config } from './config.js';

const TOOL_DEFINITIONS = [
  {
    id: 'subfinder',
    label: 'Subfinder',
    command: 'subfinder',
    versionArgs: ['-version'],
    required: true,
    recommendation: 'Install with: brew install subfinder',
  },
  {
    id: 'nmap',
    label: 'Nmap',
    command: 'nmap',
    versionArgs: ['--version'],
    required: true,
    recommendation: 'Install with: brew install nmap',
  },
  {
    id: 'nuclei',
    label: 'Nuclei',
    command: 'nuclei',
    versionArgs: ['-version'],
    required: true,
    recommendation: 'Install with: brew install nuclei',
  },
  {
    id: 'sqlmap',
    label: 'sqlmap',
    command: 'sqlmap',
    versionArgs: ['--version'],
    required: false,
    recommendation: 'Optional exploit helper: brew install sqlmap',
  },
];
const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function firstLine(value) {
  return String(value || '')
    .replace(ANSI_PATTERN, '')
    .split('\n')
    .map(line => line.trim())
    .find(Boolean) || null;
}

async function checkBinary(definition) {
  let resolved;

  try {
    resolved = await execa('which', [definition.command], { reject: false });
  } catch {
    resolved = { exitCode: 1, stdout: '' };
  }

  const installed = resolved.exitCode === 0 && Boolean(resolved.stdout?.trim());
  let version = null;

  if (installed && definition.versionArgs?.length) {
    try {
      const result = await execa(definition.command, definition.versionArgs, {
        reject: false,
        timeout: 3000,
      });
      version = firstLine(result.stdout) || firstLine(result.stderr);
    } catch (err) {
      version = firstLine(err.stdout) || firstLine(err.stderr);
    }
  }

  return {
    id: definition.id,
    label: definition.label,
    command: definition.command,
    required: definition.required,
    installed,
    path: installed ? resolved.stdout.trim() : null,
    version,
    status: installed ? 'ready' : definition.required ? 'missing' : 'optional',
    recommendation: installed ? null : definition.recommendation,
  };
}

export async function getToolReadiness() {
  const tools = await Promise.all(TOOL_DEFINITIONS.map(checkBinary));
  const groq = {
    id: 'groq',
    label: 'Groq AI',
    command: 'GROQ_API_KEY',
    required: true,
    installed: Boolean(config.groqApiKey),
    path: config.groqApiKey ? '.env' : null,
    version: null,
    status: config.groqApiKey ? 'ready' : 'missing',
    recommendation: config.groqApiKey ? null : 'Set GROQ_API_KEY in .env',
  };
  const allTools = [...tools, groq];
  const required = allTools.filter(tool => tool.required);
  const readyRequired = required.filter(tool => tool.installed).length;

  return {
    tools: allTools,
    summary: {
      readyRequired,
      totalRequired: required.length,
      optionalMissing: allTools.filter(tool => !tool.required && !tool.installed).length,
      operational: readyRequired === required.length,
    },
  };
}
