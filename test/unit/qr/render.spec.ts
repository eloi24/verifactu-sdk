/**
 * Smoke tests for `src/qr/render.ts`.
 *
 * The `qrcode` library is upstream-tested, so the unit tests here only assert
 * that the renderers actually produce the requested format and contain the
 * expected magic bytes / signature substrings.
 */

import { describe, expect, it } from 'bun:test';
import { renderQrDataUrl, renderQrPng, renderQrSvg } from '../../../src/qr/render.ts';

const SAMPLE_URL =
  'https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR?nif=89890001K&numserie=12345678-G33&fecha=01-09-2024&importe=241.4';

describe('renderQrPng', () => {
  it('produces a Buffer that starts with the PNG magic bytes', async () => {
    const png = await renderQrPng(SAMPLE_URL);
    expect(png).toBeInstanceOf(Buffer);
    expect(png.length).toBeGreaterThan(8);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(png[0]).toBe(0x89);
    expect(png[1]).toBe(0x50);
    expect(png[2]).toBe(0x4e);
    expect(png[3]).toBe(0x47);
    expect(png[4]).toBe(0x0d);
    expect(png[5]).toBe(0x0a);
    expect(png[6]).toBe(0x1a);
    expect(png[7]).toBe(0x0a);
  });

  it('honours the sizeMm option (smaller QR ⇒ smaller PNG)', async () => {
    const small = await renderQrPng(SAMPLE_URL, { sizeMm: 20, dpi: 100 });
    const large = await renderQrPng(SAMPLE_URL, { sizeMm: 40, dpi: 300 });
    expect(large.length).toBeGreaterThan(small.length);
  });
});

describe('renderQrSvg', () => {
  it('produces an SVG document starting with <svg', async () => {
    const svg = await renderQrSvg(SAMPLE_URL);
    expect(typeof svg).toBe('string');
    expect(svg.startsWith('<svg') || svg.startsWith('<?xml')).toBe(true);
    expect(svg.includes('<svg')).toBe(true);
  });
});

describe('renderQrDataUrl', () => {
  it('produces a data URL with the PNG mime prefix', async () => {
    const dataUrl = await renderQrDataUrl(SAMPLE_URL);
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(dataUrl.length).toBeGreaterThan('data:image/png;base64,'.length);
  });
});
