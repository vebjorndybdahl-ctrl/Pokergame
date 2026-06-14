import "server-only";
import {
  scrypt as scryptCb,
  randomBytes,
  timingSafeEqual,
  type ScryptOptions,
} from "crypto";

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// scrypt cost parameters. 128 * N * r ≈ 16 MB of memory, under Node's 32 MB
// default maxmem — fine on the Vercel Node runtime, no native deps.
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

// Returns "scrypt$N$r$p$saltB64$hashB64"
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(plain, salt, KEYLEN, {
    N,
    r: R,
    p: P,
  })) as Buffer;
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${derived.toString(
    "base64",
  )}`;
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const n = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = Buffer.from(parts[4], "base64");
    const hash = Buffer.from(parts[5], "base64");
    const derived = (await scryptAsync(plain, salt, hash.length, {
      N: n,
      r,
      p,
    })) as Buffer;
    return derived.length === hash.length && timingSafeEqual(derived, hash);
  } catch {
    return false;
  }
}
