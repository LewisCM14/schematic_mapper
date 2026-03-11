import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { FIXTURES } from "./fixtures";

// Re-export for backward compatibility
export { FIXTURES, IMAGE_ID, UPLOAD_ID } from "./fixtures";

// ── Default request handlers ─────────────────────────────────────────────────

export const handlers = [
	http.get("/api/health", () =>
		HttpResponse.json({ status: "ok", db: "connected" }),
	),

	http.get("/api/drawing-types", () =>
		HttpResponse.json(FIXTURES.drawingTypes),
	),

	http.get("/api/images", () =>
		HttpResponse.json({
			results: [FIXTURES.image],
			has_more: false,
			next_cursor: null,
		}),
	),

	http.get("/api/images/:imageId", () =>
		HttpResponse.json(FIXTURES.imageDetail),
	),

	http.get("/api/images/:imageId/fitting-positions", () =>
		HttpResponse.json(FIXTURES.positions),
	),

	http.get("/api/search", () => HttpResponse.json(FIXTURES.searchResponse)),

	http.get("/api/fitting-positions/:id/details", () =>
		HttpResponse.json(FIXTURES.positionDetail),
	),

	http.post("/api/admin/uploads", () =>
		HttpResponse.json(FIXTURES.uploadSession, { status: 201 }),
	),

	http.put("/api/admin/uploads/:id/parts/:partNumber", ({ params }) =>
		HttpResponse.json({
			upload_id: params.id,
			part_number: Number(params.partNumber),
			state: "uploading",
		}),
	),

	http.post("/api/admin/uploads/:id/complete", () =>
		HttpResponse.json(FIXTURES.uploadComplete, { status: 201 }),
	),

	http.delete(
		"/api/admin/uploads/:id",
		() => new HttpResponse(null, { status: 204 }),
	),

	http.post("/api/admin/fitting-positions/bulk", () =>
		HttpResponse.json({ created: 0, updated: 0 }),
	),

	http.delete(
		"/api/admin/fitting-positions/:id",
		() => new HttpResponse(null, { status: 204 }),
	),
];

// ── MSW server instance ──────────────────────────────────────────────────────

export const server = setupServer(...handlers);
