const query = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches);
}

export function subscribeToReducedMotion(onChange) {
  const media = window.matchMedia?.(query);
  if (!media) return () => {};
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
