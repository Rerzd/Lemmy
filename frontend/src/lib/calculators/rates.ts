// Effective annual rate (0.24 = 24 % EA) -> the equivalent monthly rate.
// Compounding twelve times must give back the annual rate: (1 + m)^12 = 1 + EA,
// so m = (1 + EA)^(1/12) - 1. Dividing by 12 would overstate it (24 % EA is 1.81 %, not 2 %, a month).
export function monthlyFromEffectiveAnnual(effectiveAnnual: number): number {
  return effectiveAnnual === 0 ? 0 : Math.pow(1 + effectiveAnnual, 1 / 12) - 1
}
