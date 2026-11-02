import sharp from "sharp";
/** Inspect bounded raster metadata without executing SVG or trusting the filename. */
export async function validateImage(bytes: Buffer, mime: string) {
  const format = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/webp": "webp",
  }[mime];
  if (!format) throw Error("400:Upload a PNG, JPG or WebP image.");
  try {
    const decoder = sharp(bytes, {
      limitInputPixels: 25_000_000,
      animated: false,
    });
    const metadata = await decoder.metadata();
    if (
      metadata.format !== format ||
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > 25_000_000 ||
      (metadata.pages || 1) > 1
    )
      throw Error("Unsupported image.");
    // Metadata alone accepts damaged compressed pixels; decode before storing bytes.
    await decoder.stats();
  } catch {
    throw Error(
      "400:This image is malformed, animated or too large to preview safely. Choose a still image up to 25 megapixels.",
    );
  }
}
