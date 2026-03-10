/** Pure utility functions for file hashing and encoding. */

export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}
