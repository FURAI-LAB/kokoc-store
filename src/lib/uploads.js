/**
 * uploads.js — single source of truth for validating uploaded image files.
 *
 * Why this exists
 * ---------------
 * Both image upload paths (routes/admin/products.js → uploadImage, and
 * routes/admin/index.js → /admin/api/collabs/upload) used to do this:
 *
 *     const ext = file.name.split(".").pop().toLowerCase();
 *     await bucket.put(key, file.stream(), {
 *       httpMetadata: { contentType: file.type },   // ← attacker-controlled
 *     });
 *
 * `file.type` comes straight from the multipart body, so the uploader
 * chooses it. The /r2/ and /cdn/ proxy in server.js replays whatever was
 * stored via object.writeHttpMetadata(headers) — so uploading a file with
 * type "text/html" (or "image/svg+xml", which browsers execute scripts in)
 * yields an HTML/SVG document served from our own origin. That is stored
 * XSS on a first-party path, which also defeats the same-origin assumptions
 * the CSP is built on.
 *
 * The extension was equally untrusted: `file.name` of "x.html" produced an
 * R2 key ending in .html, and "../../evil" style names were never rejected.
 *
 * Fix: derive BOTH the extension and the Content-Type from a fixed
 * allow-list, keyed off the extension, and cross-check the browser-supplied
 * MIME against it. Nothing attacker-controlled reaches httpMetadata.
 */

/** ext → the ONLY content-type we will ever serve for that ext. */
const ALLOWED_IMAGE_TYPES = {
  png:  "image/png",
  jpg:  "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif:  "image/gif",
  avif: "image/avif"
};

/**
 * Note on SVG: deliberately NOT allowed. SVG is an XML document that can
 * carry <script>, and browsers execute it when the file is navigated to
 * directly. There is no safe way to serve user-supplied SVG from the same
 * origin as the storefront without a separate sandbox domain.
 */

/** 10 MB — generous for product photography, bounded enough to not be a DoS. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Validate an uploaded File from formData.
 *
 * @param {File|null} file
 * @returns {{ ok: true, ext: string, contentType: string }
 *          | { ok: false, error: string, status: number }}
 */
export function validateImageUpload(file) {
  if (!file || typeof file.name !== "string" || typeof file.stream !== "function") {
    return { ok: false, error: "file required", status: 400 };
  }

  if (typeof file.size === "number" && file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `File too large (max ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB)`,
      status: 413
    };
  }

  if (typeof file.size === "number" && file.size === 0) {
    return { ok: false, error: "File is empty", status: 400 };
  }

  // Take only the final path segment before splitting on "." so that a
  // crafted name like "../../etc/passwd.png" cannot contribute path
  // separators to the extension.
  const baseName = file.name.split(/[\\/]/).pop() || "";
  const parts = baseName.split(".");
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : "";

  const contentType = ALLOWED_IMAGE_TYPES[ext];
  if (!contentType) {
    return {
      ok: false,
      error: `Unsupported file type. Allowed: ${Object.keys(ALLOWED_IMAGE_TYPES).join(", ")}`,
      status: 400
    };
  }

  // Cross-check the browser-declared MIME. We never USE file.type — we only
  // reject on an outright contradiction (e.g. name says .png but the body is
  // declared text/html), which catches the naive rename attack early.
  const declared = String(file.type || "").toLowerCase().split(";")[0].trim();
  if (declared && declared !== contentType) {
    const jpegPair = contentType === "image/jpeg" && declared === "image/jpg";
    if (!jpegPair) {
      return { ok: false, error: "File content-type does not match its extension", status: 400 };
    }
  }

  return { ok: true, ext, contentType };
}

/**
 * Object key sanitiser for the R2 proxy in server.js.
 *
 * The proxy slices the key straight out of the URL path, so "/r2/../foo"
 * or an encoded traversal would be handed to R2 verbatim. R2 keys are flat
 * strings (not a real filesystem), so traversal cannot escape the bucket —
 * but normalising here keeps the served key space to exactly what we write
 * and stops "%2e%2e%2f" style probing from reaching storage at all.
 *
 * @param {string} rawKey
 * @returns {string|null} the safe key, or null if it must be rejected
 */
export function sanitizeR2Key(rawKey) {
  if (!rawKey) return null;

  let key;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    return null; // malformed percent-encoding
  }

  if (key.includes("\0")) return null;
  if (key.includes("..")) return null;
  if (key.startsWith("/")) return null;

  // Keys we generate look like "products/<id>/<uuid>.<ext>" or
  // "collabs/<uuid>.<ext>" — conservative charset, no spaces.
  if (!/^[A-Za-z0-9._\-/]+$/.test(key)) return null;

  return key;
}
