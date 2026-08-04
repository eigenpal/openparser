import { PDFDocument } from 'pdf-lib';

/**
 * Returns PDF page count for provider clients that need expected page hints.
 * Does not enforce admission pixel limits — callers validate uploads separately.
 */
export async function countPdfPages(content: Uint8Array): Promise<number> {
  const envelope = Buffer.from(content).toString('latin1');
  if (!envelope.startsWith('%PDF-') || !envelope.includes('%%EOF')) {
    throw new Error('uploaded PDF is malformed');
  }

  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(content, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      (error instanceof Error && error.name === 'EncryptedPDFError') ||
      /encrypted/i.test(message)
    ) {
      throw new Error('encrypted PDFs are not supported');
    }
    throw new Error('uploaded PDF is malformed');
  }

  return pdf.getPageCount();
}
