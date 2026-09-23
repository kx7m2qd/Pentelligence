// Pausing only changes execution eligibility; saved configuration and history
// remain intact even when the target cannot currently be validated.
export function schedulePauseHandler(db, serialize) {
  return (req, res, next) => {
    const program = db.prepare('SELECT * FROM programs WHERE id = ? AND workspace_id = ?')
      .get(Number(req.params.id), req.workspaceId);
    if (!program) return res.status(404).json({ error: 'program not found' });
    if (typeof req.body?.enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    if (req.body.enabled) return next();
    db.prepare(`
    UPDATE program_schedules
    SET enabled = 0, next_run_at = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE program_id = ? AND workspace_id = ?
    `).run(program.id, req.workspaceId);
    return res.json({ program: serialize(program) });
  };
}
