/** Count actual streamed bytes; Content-Length is only an early rejection hint. */
export async function boundedBody(req: Request, max: number) {
  if (Number(req.headers.get("content-length") || 0) > max)
    throw Error("413:Request is too large.");
  const reader = req.body?.getReader();
  if (!reader) throw Error("400:Request data required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        throw Error("413:Request is too large.");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}
