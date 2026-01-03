/**
 * Generates a UUID v4 compatible string.
 * This is a fallback for environments where crypto.randomUUID() is not available
 * (e.g., non-secure contexts like LAN access on mobile).
 */
export const generateUUID = (): string => {
  // If crypto.randomUUID is available, use it
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    // We wrap in try-catch because sometimes it exists but throws in insecure contexts
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback below
    }
  }

  // Fallback implementation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
