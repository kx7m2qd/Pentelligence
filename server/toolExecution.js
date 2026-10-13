// Match readiness probes to the environment used by the scanner itself.
const SCANNER_PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';

export function toolExecution(id, environment = process.env) {
  return {
    command: id === 'nmap' ? environment.NMAP_PATH || id : id,
    env: ['nmap', 'subfinder'].includes(id)
      ? { ...environment, PATH: SCANNER_PATH }
      : { ...environment },
  };
}
