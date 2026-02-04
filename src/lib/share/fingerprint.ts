/**
 * Visitor fingerprinting utilities for anonymous view tracking
 * Generates a privacy-respecting fingerprint for analytics
 */

/**
 * Generate a simple visitor fingerprint from available browser data
 * This is a lightweight implementation that doesn't require external libraries
 */
export async function generateVisitorFingerprint(): Promise<string> {
  if (typeof window === "undefined") {
    // Server-side: generate a random fingerprint
    return `server-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }

  const components: string[] = [];

  // Screen properties
  if (window.screen) {
    components.push(`${window.screen.width}x${window.screen.height}`);
    components.push(`${window.screen.colorDepth}`);
  }

  // Timezone
  try {
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    components.push("unknown-tz");
  }

  // Language
  components.push(navigator.language || "unknown");

  // Platform
  components.push(navigator.platform || "unknown");

  // Number of CPU cores
  if (navigator.hardwareConcurrency) {
    components.push(`cores:${navigator.hardwareConcurrency}`);
  }

  // Device memory (if available)
  if ("deviceMemory" in navigator) {
    components.push(`mem:${(navigator as Navigator & { deviceMemory?: number }).deviceMemory}`);
  }

  // Touch support
  const touchSupport = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  components.push(`touch:${touchSupport}`);

  // Canvas fingerprint (simplified)
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("Beespo", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("Beespo", 4, 17);
      components.push(canvas.toDataURL().slice(-50));
    }
  } catch {
    components.push("no-canvas");
  }

  // WebGL renderer (if available)
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl && "getParameter" in gl && "getExtension" in gl) {
      const webGL = gl as WebGLRenderingContext;
      const debugInfo = webGL.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        const renderer = webGL.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (renderer) {
          components.push(renderer.substring(0, 50));
        }
      }
    }
  } catch {
    components.push("no-webgl");
  }

  // Generate hash from components
  const fingerprint = components.join("|");
  return await hashString(fingerprint);
}

/**
 * Hash a string using SHA-256 (if available) or a simple hash
 */
async function hashString(str: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // Fallback to simple hash
    }
  }

  // Simple hash fallback
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Get stored fingerprint from localStorage or generate new one
 */
export async function getOrCreateFingerprint(): Promise<string> {
  if (typeof window === "undefined") {
    return generateVisitorFingerprint();
  }

  const storageKey = "beespo_visitor_fp";

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return stored;
    }
  } catch {
    // localStorage not available
  }

  const fingerprint = await generateVisitorFingerprint();

  try {
    localStorage.setItem(storageKey, fingerprint);
  } catch {
    // localStorage not available
  }

  return fingerprint;
}

/**
 * Get referrer information
 */
export function getReferrer(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  return document.referrer || null;
}

/**
 * Get user agent
 */
export function getUserAgent(): string | null {
  if (typeof navigator === "undefined") {
    return null;
  }
  return navigator.userAgent || null;
}
