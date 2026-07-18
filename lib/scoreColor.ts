export function vsParLabel(vsPar: number): string {
  return vsPar === 0 ? "E" : vsPar > 0 ? `+${vsPar}` : `${vsPar}`;
}

export function vsParColor(vsPar: number): string {
  if (vsPar <= -2) return "var(--s-eagle)";
  if (vsPar === -1) return "var(--s-birdie)";
  if (vsPar === 0) return "var(--s-par)";
  if (vsPar === 1) return "var(--s-bogey)";
  if (vsPar === 2) return "var(--s-double)";
  return "var(--s-triple)";
}

export function vsParBucketName(vsPar: number): string {
  if (vsPar <= -2) return "Eagle−";
  if (vsPar === -1) return "Birdie";
  if (vsPar === 0) return "Par";
  if (vsPar === 1) return "Bogey";
  if (vsPar === 2) return "Double";
  return "Triple+";
}
