// Execution success is distinct from a template match and from exploitability.
export function parseNucleiOutput(result) {
  if (result.timedOut || result.isCanceled || result.signal || result.exitCode !== 0) {
    throw new Error(`Nuclei execution failed (${result.timedOut ? 'timeout' : result.signal || `exit ${result.exitCode ?? 'unknown'}`}); check coverage is incomplete`);
  }
  return String(result.stdout || '').split('\n').filter(line => line.trim()).map(line => {
    let hit;
    try { hit = JSON.parse(line); }
    catch (cause) { throw new Error('Nuclei returned invalid JSON; check coverage is incomplete', { cause }); }
    if (!hit || typeof hit['template-id'] !== 'string' || !hit['template-id'] ||
        typeof hit.info?.name !== 'string' || typeof hit['matched-at'] !== 'string') {
      throw new Error('Nuclei returned an invalid finding; check coverage is incomplete');
    }
    return hit;
  });
}
