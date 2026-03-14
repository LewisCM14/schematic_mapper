/**
 * httpClient.ts
 *
 * Configured Axios HTTP client for all API requests in the Schematic Mapper frontend.
 *
 * - Sets baseURL to /api for all requests (proxied to backend).
 * - Applies JSON content-type header by default.
 * - Adds a unique X-Request-ID header to every request for traceability.
 * - Handles 401/403 responses with a warning (for future auth handling).
 *
 * Use this client in all service functions and React Query hooks for consistent API behavior.
 */
import axios, { type AxiosError } from "axios";

// Create a pre-configured Axios instance for API calls
const httpClient = axios.create({
	baseURL: "/api",
	headers: { "Content-Type": "application/json" },
});

// Add a unique request ID to every outgoing request for backend tracing
httpClient.interceptors.request.use((config) => {
	config.headers["X-Request-ID"] = crypto.randomUUID();
	return config;
});

// Log authentication errors (401/403) for future handling (e.g., redirect to login)
httpClient.interceptors.response.use(
	(response) => response,
	(error: AxiosError) => {
		if (error.response?.status === 401 || error.response?.status === 403) {
			console.warn(`Auth error ${error.response.status}: ${error.config?.url}`);
		}
		return Promise.reject(error);
	},
);

// Export the configured client for use in all API calls
export default httpClient;
