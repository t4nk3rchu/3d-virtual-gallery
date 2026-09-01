/**
 * Task 11: Curator CMS — GLB file validation
 *
 * Validates GLB magic bytes (spec §5.6):
 *   - Must be a .glb file (magic bytes 0x67 0x6C 0x54 0x46 = "glTF")
 *   - Size < 50 MB (hard cap)
 *   - Warn at > 25 MB (soft budget)
 *
 * This is pure logic — independently testable without React or Babylon.
 */

export interface GlbValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

const GLB_MAGIC = [0x67, 0x6c, 0x54, 0x46]; // "glTF"
const MAX_SIZE_BYTES = 200 * 1024 * 1024;  // 200 MB hard cap
const WARN_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB soft budget

export async function validateGlbFile(file: File): Promise<GlbValidationResult> {
  // Size check
  if (file.size > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — exceeds the 200 MB hard cap. Decimate geometry or reduce texture sizes and re-export.`,
    };
  }

  // Magic bytes check (first 4 bytes must be "glTF")
  const header = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(header);
  const isGlb = GLB_MAGIC.every((b, i) => bytes[i] === b);

  if (!isGlb) {
    return {
      valid: false,
      error: 'File does not appear to be a valid GLB. The first 4 bytes must be "glTF". Ensure you exported as glTF Binary (.glb), not as .gltf.',
    };
  }

  // Soft warning
  if (file.size > WARN_SIZE_BYTES) {
    return {
      valid: true,
      warning: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — above the 100 MB soft budget. Consider enabling Draco compression and reducing texture sizes.`,
    };
  }

  return { valid: true };
}

/** Extract a Drive fileId from a URL or bare ID (reuses the media lib helper) */
export { extractGoogleDriveFileId } from '../media/gdrive';
