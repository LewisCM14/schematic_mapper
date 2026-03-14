/**
 * fileUtils.ts
 *
 * Pure utility functions for file hashing and encoding in the Schematic Mapper frontend.
 *
 * - Provides browser-native SHA-256 hashing for ArrayBuffers (e.g., file uploads).
 * - Converts ArrayBuffers to base64 strings for API payloads.
 * - No external dependencies; uses Web Crypto and built-in APIs.
 *
 * Use these helpers in upload and file-processing flows for consistent encoding and hashing.
 */

/**
 * Compute the SHA-256 hash of an ArrayBuffer and return it as a lowercase hex string.
 * @param buffer The input data to hash (e.g., file contents)
 * @returns Promise resolving to the hex-encoded SHA-256 digest
 */
export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Convert an ArrayBuffer to a base64-encoded string.
 * @param buffer The input data to encode
 * @returns Base64 string representation of the buffer
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}
