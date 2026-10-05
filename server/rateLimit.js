export function rateLimit({ windowMs = 60_000, max = 120, now = Date.now, key: keyFor = req => `${req.ip}:${req.baseUrl}:${req.path}` } = {}) {
  // Each policy owns its counters, including when middleware is nested.
  const buckets = new Map();
  const sweep = () => {
    const time = now();
    for (const [key, bucket] of buckets) {
      if (time >= bucket.resetAt) buckets.delete(key);
    }
  };
  const timer = setInterval(sweep, windowMs);
  timer.unref();

  const middleware = (req, res, next) => {
    const key = keyFor(req);
    const time = now();
    let bucket = buckets.get(key);
    if (!bucket || time >= bucket.resetAt) {
      bucket = { count: 0, resetAt: time + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.set('Retry-After', String(Math.ceil((bucket.resetAt - time) / 1000)));
      return res.status(429).json({ error: 'too many requests; retry shortly' });
    }
    next();
  };
  middleware.close = () => { clearInterval(timer); buckets.clear(); };
  return middleware;
}
