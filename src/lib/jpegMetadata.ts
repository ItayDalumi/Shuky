/**
 * Removes metadata segments from a JPEG: APP1 (EXIF, incl. GPS, and XMP), APP13 (IPTC) and
 * comments. Keeps the image data, JFIF (APP0) and the color profile (APP2). Non-JPEG input is
 * returned unchanged. Pure TypeScript, so it behaves the same on iOS, Android and web.
 */
const DROP = new Set([0xe1, 0xed, 0xfe]);

export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;

  const kept: Uint8Array[] = [bytes.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) break; // not a marker: malformed, keep the rest as-is
    const marker = bytes[i + 1];
    if (marker === 0xda) break; // start of scan: compressed image data follows
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    const end = i + 2 + length;
    if (length < 2 || end > bytes.length) break;
    if (!DROP.has(marker)) kept.push(bytes.subarray(i, end));
    i = end;
  }
  kept.push(bytes.subarray(i));

  const out = new Uint8Array(kept.reduce((n, part) => n + part.length, 0));
  let offset = 0;
  for (const part of kept) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** True if the JPEG still has an EXIF / XMP / IPTC segment before the image data. */
export function hasJpegMetadata(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let i = 2;
  while (i + 4 <= bytes.length && bytes[i] === 0xff && bytes[i + 1] !== 0xda) {
    if (DROP.has(bytes[i + 1])) return true;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return false;
}
