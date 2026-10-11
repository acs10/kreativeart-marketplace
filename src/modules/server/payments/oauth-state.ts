import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "../secrets";

/** "state" do OAuth: amarra a volta do Mercado Pago ao designer que pediu (assinado, vale 15 min). */
const sign = (payload: string) => createHmac("sha256", sessionSecret()).update(`mp-oauth:${payload}`).digest("base64url");

export function createState(designerId: string): string {
  const payload = `${designerId}.${Math.floor(Date.now() / 1000) + 900}`;
  return `${payload}.${sign(payload)}`;
}

export function readState(state: string): string | null {
  const [id, exp, sig] = state.split(".");
  if (!id || !exp || !sig) return null;
  const expected = Buffer.from(sign(`${id}.${exp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given) || Number(exp) < Date.now() / 1000) return null;
  return id;
}
