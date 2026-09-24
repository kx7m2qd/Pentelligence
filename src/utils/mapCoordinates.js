export function screenToSvg(svg, clientX, clientY) {
  const matrix = svg?.getScreenCTM();
  if (!matrix) return null;
  const inverse = matrix.inverse();
  return {
    x: inverse.a * clientX + inverse.c * clientY + inverse.e,
    y: inverse.b * clientX + inverse.d * clientY + inverse.f,
  };
}
