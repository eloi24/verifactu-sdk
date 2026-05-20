/**
 * Render the AEAT tax-QR URL as a printable image (PNG, SVG, or data URL).
 *
 * The renderer is a thin wrapper around the `qrcode` library. It pins the
 * error-correction level to `'M'` (medium) as required by the AEAT
 * specification (article 21.1 of the order), keeps the quiet-zone margin
 * within the minimum recommended by §3 of the QR spec, and converts the
 * caller-facing `sizeMm` / `dpi` parameters into the pixel-width that the
 * underlying library expects.
 *
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DetalleEspecificacTecnCodigoQRfactura.pdf | QR spec v0.5.0 §2–3}
 * @module
 */

import QRCode from 'qrcode';

/**
 * Default physical size of the rendered QR, in millimetres.
 *
 * The AEAT allows any size between 30 and 40 mm; 35 mm sits in the middle of
 * that range and is the value most printers handle without losing modules.
 */
const DEFAULT_SIZE_MM = 35;

/**
 * Default dots-per-inch used when converting `sizeMm` to a pixel width.
 *
 * 300 DPI is the standard print resolution used by most invoice templates.
 */
const DEFAULT_DPI = 300;

/**
 * Default quiet-zone margin, in QR modules.
 *
 * The `qrcode` library expresses the margin in modules, not pixels — 4 is the
 * value recommended by ISO/IEC 18004:2015 and what §3 of the QR spec endorses
 * (at least 2 mm of white space around the symbol).
 */
const DEFAULT_MARGIN_MODULES = 4;

/**
 * Tunable rendering options shared by every output format.
 */
export interface RenderQrOptions {
  /** Physical width/height in millimetres (default `35`). */
  sizeMm?: number;
  /** Print resolution used to convert `sizeMm` to pixels (default `300`). */
  dpi?: number;
  /** Quiet-zone width in QR modules (default `4`, minimum recommended by §3). */
  marginModules?: number;
}

/**
 * Compute the pixel width that the `qrcode` library should produce for the
 * requested physical size at the requested DPI.
 */
function computePixelWidth(sizeMm: number, dpi: number): number {
  return Math.max(1, Math.round((sizeMm / 25.4) * dpi));
}

/**
 * Merge caller-supplied options with the AEAT defaults and pre-compute the
 * derived pixel width used by every renderer.
 */
function resolveOptions(opts: RenderQrOptions | undefined): {
  width: number;
  margin: number;
} {
  const sizeMm = opts?.sizeMm ?? DEFAULT_SIZE_MM;
  const dpi = opts?.dpi ?? DEFAULT_DPI;
  const margin = opts?.marginModules ?? DEFAULT_MARGIN_MODULES;
  return { width: computePixelWidth(sizeMm, dpi), margin };
}

/**
 * Render the QR URL as a PNG buffer.
 *
 * The output uses the binary PNG signature `89 50 4E 47` and embeds the QR at
 * the requested physical size (default 35 mm at 300 DPI ≈ 413 px).
 *
 * @param url - URL produced by {@link buildQrUrl}.
 * @param opts - Optional rendering tweaks; see {@link RenderQrOptions}.
 * @returns A `Buffer` whose bytes form a complete PNG image.
 * @throws {Error} If the URL is too long to fit into a QR at level `M` (the
 *   underlying `qrcode` library propagates its own error in that case).
 * @example
 * ```ts
 * const url = buildQrUrl({ ... });
 * const png = await renderQrPng(url, { sizeMm: 30 });
 * await Bun.write('invoice-qr.png', png);
 * ```
 */
export async function renderQrPng(url: string, opts?: RenderQrOptions): Promise<Buffer> {
  const { width, margin } = resolveOptions(opts);
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin,
    width,
  });
}

/**
 * Render the QR URL as an SVG string.
 *
 * The returned string starts with `<svg` and can be embedded directly into
 * HTML or saved as a `.svg` file. The QR uses the same error-correction level
 * (`M`) and margin defaults as the PNG renderer.
 *
 * @param url - URL produced by {@link buildQrUrl}.
 * @param opts - Optional rendering tweaks; see {@link RenderQrOptions}.
 * @returns A complete SVG document as a `string`.
 * @throws {Error} If the URL cannot be encoded at level `M`.
 * @example
 * ```ts
 * const url = buildQrUrl({ ... });
 * const svg = await renderQrSvg(url);
 * await Bun.write('invoice-qr.svg', svg);
 * ```
 */
export async function renderQrSvg(url: string, opts?: RenderQrOptions): Promise<string> {
  const { width, margin } = resolveOptions(opts);
  return QRCode.toString(url, {
    errorCorrectionLevel: 'M',
    type: 'svg',
    margin,
    width,
  });
}

/**
 * Render the QR URL as a `data:image/png;base64,...` URL.
 *
 * Useful when the QR needs to be inlined into an HTML/PDF template without
 * touching the filesystem.
 *
 * @param url - URL produced by {@link buildQrUrl}.
 * @param opts - Optional rendering tweaks; see {@link RenderQrOptions}.
 * @returns A `data:` URI with the PNG bytes base64-encoded.
 * @throws {Error} If the URL cannot be encoded at level `M`.
 * @example
 * ```ts
 * const url = buildQrUrl({ ... });
 * const dataUrl = await renderQrDataUrl(url);
 * // → "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
 * ```
 */
export async function renderQrDataUrl(url: string, opts?: RenderQrOptions): Promise<string> {
  const { width, margin } = resolveOptions(opts);
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin,
    width,
  });
}
