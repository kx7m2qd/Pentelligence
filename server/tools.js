import { execa } from 'execa';
import { config } from './config.js';
import { toolExecution } from './toolExecution.js';

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

export async function checkBinary(definition, execute = execa, environment = process.env) {
  const { command, env } = toolExecution(definition.command, environment);
  let resolved;

  try {
    resolved = await execute('which', [command], { reject: false, env });
  } catch {
    resolved = { exitCode: 1, stdout: '' };
  }

  const found = resolved.exitCode === 0 && Boolean(resolved.stdout?.trim());
  let installed = found;
  let version = null;

  if (installed && definition.versionArgs?.length) {
    try {
      const result = await execute(command, definition.versionArgs, {
        env,
        reject: false,
        timeout: 3000,
      });
      installed = result.exitCode === 0;
      version = firstLine(result.stdout) || firstLine(result.stderr);
    } catch (err) {
      installed = false;
      version = firstLine(err.stdout) || firstLine(err.stderr);
    }
  }

  return {
    id: definition.id,
    label: definition.label,
    command: definition.command,
    required: definition.required,
    installed,
    path: found ? resolved.stdout.trim() : null,
    version,
    status: installed ? 'ready' : definition.required ? 'missing' : 'optional',
    recommendation: installed ? null : found
      ? `${definition.label} was found but its version check failed. Check executable permissions, runtime dependencies and binary compatibility.`
      : definition.recommendation,
  };
}

export async function getToolReadiness(execute = execa, environment = process.env) {
  const tools = await Promise.all(TOOL_DEFINITIONS.map(definition => checkBinary(definition, execute, environment)));
  const ai = {
    id: 'ai',
    label: config.aiProvider === 'ollama' ? 'Ollama AI' : 'Groq AI',
    command: config.aiProvider === 'ollama' ? 'OLLAMA_BASE_URL' : 'GROQ_API_KEY',
    required: true,
    installed: config.aiEnabled,
    path: config.aiEnabled ? (config.aiProvider === 'ollama' ? config.ollamaBaseUrl : '.env') : null,
    version: null,
    status: config.aiEnabled ? 'ready' : 'missing',
    recommendation: config.aiEnabled
      ? null
      : config.aiProvider === 'ollama'
        ? `Start Ollama and pull ${config.ollamaModel}`
        : 'Set GROQ_API_KEY in .env',
  };
  const allTools = [...tools, ai];
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
