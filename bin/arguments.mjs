export const usage = 'Usage: npm run pentelligence -- scan TARGET [--base http://localhost:3001] [--program ID]';

export function parseArguments(args, defaultBase = 'http://localhost:3001') {
  if (args.length === 0 || (args.length === 1 && ['--help', '-h', 'help'].includes(args[0]))) return { help: true };
  if (args[0] !== 'scan') throw new Error('Unknown command. Use --help for usage.');
  let target;
  const options = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (['--base', '--program'].includes(arg)) {
      if (options[arg] !== undefined) throw new Error(`Duplicate option: ${arg}`);
      const value = args[++i];
      if (!value || value.startsWith('-')) throw new Error(`Missing value for ${arg}`);
      options[arg] = value;
    } else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else if (target) throw new Error('Only one target is supported.');
    else target = arg.trim();
  }
  if (!target) throw new Error('A target is required.');
  let base;
  try { base = new URL(options['--base'] || defaultBase); } catch { throw new Error('Invalid backend URL.'); }
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error('Backend URL must be HTTP(S), without credentials, query, or fragment.');
  }
  const program = options['--program'];
  if (program !== undefined && (!/^[1-9]\d*$/.test(program) || !Number.isSafeInteger(Number(program)))) {
    throw new Error('Program ID must be a positive safe integer.');
  }
  return { target, base: base.href.replace(/\/$/, ''), programId: program === undefined ? undefined : Number(program) };
}
