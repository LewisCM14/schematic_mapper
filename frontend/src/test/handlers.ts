/**
 * handlers.ts
 *
 * MSW (Mock Service Worker) request handlers and server setup for frontend tests.
 *
 * - Defines default API request handlers for all backend endpoints used in tests.
 * - Uses msw/node to intercept and mock HTTP requests during test runs.
 * - Imports static fixtures for consistent, predictable test data.
 * - Exports the MSW server instance for use in test setup/teardown.
 *
 * This file enables full API mocking for frontend integration and unit tests, ensuring tests are fast and deterministic.
 */
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { FIXTURES } from "./fixtures";

// Re-export fixtures and IDs for use in tests
export { FIXTURES, IMAGE_ID, UPLOAD_ID } from "./fixtures";

// ── Default request handlers: mock all backend API endpoints used by the app ──

export const handlers = [
	// Health check endpoint
	http.get("/api/health", () =>
		HttpResponse.json({ status: "ok", db: "connected" }),
	),

	// Drawing types list
	http.get("/api/drawing-types", () =>
		HttpResponse.json(FIXTURES.drawingTypes),
	),

	// Image list
	http.get("/api/images", () =>
		HttpResponse.json({
			results: [FIXTURES.image],
			has_more: false,
			next_cursor: undefined,
		}),
	),

	// Image detail
	http.get("/api/images/:imageId", () =>
		HttpResponse.json(FIXTURES.imageDetail),
	),

	// Fitting positions for an image
	http.get("/api/images/:imageId/fitting-positions", () =>
		HttpResponse.json(FIXTURES.positions),
	),

	// Search endpoint
	http.get("/api/search", () => HttpResponse.json(FIXTURES.searchResponse)),

	// Fitting position details
	http.get("/api/fitting-positions/:id/details", () =>
		HttpResponse.json(FIXTURES.positionDetail),
	),

	// Admin: create upload session
	http.post("/api/admin/uploads", () =>
		HttpResponse.json(FIXTURES.uploadSession, { status: 201 }),
	),

	// Admin: upload chunk
	http.put("/api/admin/uploads/:id/parts/:partNumber", ({ params }) =>
		HttpResponse.json({
			upload_id: params.id,
			part_number: Number(params.partNumber),
			state: "uploading",
		}),
	),

	// Admin: complete upload
	http.post("/api/admin/uploads/:id/complete", () =>
		HttpResponse.json(FIXTURES.uploadComplete, { status: 201 }),
	),

	// Admin: abort upload
	http.delete("/api/admin/uploads/:id", () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// Admin: bulk create fitting positions
	http.post("/api/admin/fitting-positions/bulk", () =>
		HttpResponse.json({ created: 0, updated: 0 }),
	),

	// Admin: delete fitting position
	http.delete(
		"/api/admin/fitting-positions/:id",
		() => new HttpResponse(null, { status: 204 }),
	),
];

// ── MSW server instance: used in test setup/teardown to enable API mocking ──

export const server = setupServer(...handlers);
