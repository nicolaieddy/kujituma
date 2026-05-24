// AES-GCM encryption helper for Garmin credentials at rest.
// Key is derived from GARMIN_ENCRYPTION_KEY env var via SHA-256.

const enc = new TextEncoder();
const dec = new TextDecoder();

async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("GARMIN_ENCRYPTION_KEY");
  if (!raw) throw new Error("GARMIN_ENCRYPTION_KEY not configured");
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(raw));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function bufToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function b64ToBuf(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function encryptString(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plain),
  );
  // Output: base64(iv) + "." + base64(ciphertext)
  return `${bufToB64(iv.buffer)}.${bufToB64(ct)}`;
}

export async function decryptString(packed: string): Promise<string> {
  const [ivB64, ctB64] = packed.split(".");
  if (!ivB64 || !ctB64) throw new Error("Malformed encrypted payload");
  const key = await getKey();
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBuf(ivB64) },
    key,
    b64ToBuf(ctB64),
  );
  return dec.decode(pt);
}
