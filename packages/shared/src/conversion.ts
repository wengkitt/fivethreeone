export const KG_TO_LB = 2.20462;
export const LB_TO_KG = 1 / KG_TO_LB;

export function kgToLb(kg: number): number {
  return kg * KG_TO_LB;
}

export function lbToKg(lb: number): number {
  return lb * LB_TO_KG;
}

export function convertWeight(
  value: number,
  from: "kg" | "lb",
  to: "kg" | "lb",
): number {
  if (from === to) return value;
  return from === "kg" ? kgToLb(value) : lbToKg(value);
}
