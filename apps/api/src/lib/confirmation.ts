import { randomInt } from "crypto";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1

export function generateConfirmationNumber(year: number): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CHARS[randomInt(CHARS.length)];
  }
  return `FF-${year}-${code}`;
}
