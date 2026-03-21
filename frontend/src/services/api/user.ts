// user.ts
//
// Provides a function to fetch the current user's identity and role from the backend API.
//
// Usage:
//   import { fetchUserInfo } from "../services/api/user";
//   const user = await fetchUserInfo();
//
// The returned user object contains:
//   - user_identity: string (e.g., username or email)
//   - user_role: "admin" | "viewer" (the user's role in the app)
//
// If the request fails, an error is thrown with a helpful message for UI error handling.

// src/services/api/user.ts
// Fetches the current user's identity and role from the backend.

/**
 * The shape of the user info returned by the backend.
 * - user_identity: The user's unique identifier (e.g., username or email)
 * - user_role: The user's role ("admin" or "viewer")
 */
export interface UserInfo {
	user_identity: string;
	user_role: "admin" | "viewer";
}

/**
 * Fetches the current user's identity and role from the backend API.
 *
 * Returns a UserInfo object if successful.
 * Throws an error with a helpful message if the request fails (e.g., not authenticated).
 */
export async function fetchUserInfo(): Promise<UserInfo> {
	const response = await fetch("/api/user", {
		credentials: "include",
	});
	if (!response.ok) {
		// If the response is not OK, try to get a helpful error message from the backend
		const data = await response.json().catch(() => ({}));
		throw new Error(
			data.detail || `User info fetch failed: ${response.status}`,
		);
	}
	// Return the user info as a JavaScript object
	return response.json();
}
