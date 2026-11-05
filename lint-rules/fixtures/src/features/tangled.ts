export function tangled(x: number, y: number, z: number, w: number): number {
  if (x > 0) {
    if (y > 0) {
      if (z > 0) {
        if (w > 0) return x;
      }
    }
  }
  return 0;
}
