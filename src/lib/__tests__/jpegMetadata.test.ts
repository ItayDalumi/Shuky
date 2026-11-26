import { hasJpegMetadata, stripJpegMetadata } from '../jpegMetadata';

/** Builds a JPEG-like byte stream: SOI, segments, SOS + "image data", EOI. */
function jpeg(...segments: [marker: number, payload: number[]][]): Uint8Array {
  const bytes = [0xff, 0xd8];
  for (const [marker, payload] of segments) {
    const length = payload.length + 2;
    bytes.push(0xff, marker, length >> 8, length & 0xff, ...payload);
  }
  bytes.push(0xff, 0xda, 0x00, 0x04, 0x01, 0x02, 0xaa, 0xbb, 0xcc, 0xff, 0xd9);
  return new Uint8Array(bytes);
}

const JFIF: [number, number[]] = [0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00]];
const EXIF_GPS: [number, number[]] = [0xe1, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x47, 0x50, 0x53]];
const ICC: [number, number[]] = [0xe2, [0x49, 0x43, 0x43]];
const IPTC: [number, number[]] = [0xed, [0x50, 0x68, 0x6f]];
const COMMENT: [number, number[]] = [0xfe, [0x68, 0x69]];

describe('stripJpegMetadata', () => {
  it('removes EXIF (GPS), IPTC and comments, keeps JFIF and the color profile', () => {
    const input = jpeg(JFIF, EXIF_GPS, ICC, IPTC, COMMENT);
    expect(hasJpegMetadata(input)).toBe(true);
    const out = stripJpegMetadata(input);
    expect(hasJpegMetadata(out)).toBe(false);
    expect(Array.from(out)).toEqual(Array.from(jpeg(JFIF, ICC)));
  });
  it('keeps the compressed image data untouched', () => {
    const out = stripJpegMetadata(jpeg(EXIF_GPS));
    expect(Array.from(out.slice(-11))).toEqual([0xff, 0xda, 0x00, 0x04, 0x01, 0x02, 0xaa, 0xbb, 0xcc, 0xff, 0xd9]);
  });
  it('returns non-JPEG input unchanged', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    expect(stripJpegMetadata(png)).toBe(png);
    expect(hasJpegMetadata(png)).toBe(false);
  });
  it('does not crash on truncated files', () => {
    const truncated = jpeg(EXIF_GPS).slice(0, 7);
    expect(() => stripJpegMetadata(truncated)).not.toThrow();
  });
});
