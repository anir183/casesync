export function normalizePairKey(a: string, b: string): { caseAId: string; caseBId: string } {
  if (a < b) {
    return { caseAId: a, caseBId: b }
  }
  return { caseAId: b, caseBId: a }
}
