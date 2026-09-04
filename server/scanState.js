const activeTasks = new Map();

function getScanTasks(scanId) {
  return activeTasks.get(Number(scanId)) || new Set();
}

export function beginScanTask(scanId, type) {
  const key = Number(scanId);
  const tasks = getScanTasks(key);

  if (tasks.has(type)) {
    return false;
  }

  tasks.add(type);
  activeTasks.set(key, tasks);
  return true;
}

export function endScanTask(scanId, type) {
  const key = Number(scanId);
  const tasks = getScanTasks(key);

  tasks.delete(type);

  if (tasks.size === 0) {
    activeTasks.delete(key);
    return;
  }

  activeTasks.set(key, tasks);
}

export function isAnyScanTaskActive(scanId) {
  return getScanTasks(scanId).size > 0;
}

export function isScanTaskActive(scanId, type) {
  return getScanTasks(scanId).has(type);
}

export function getActiveTaskCount() {
  return [...activeTasks.values()].reduce((total, tasks) => total + tasks.size, 0);
}
