import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

// ── Shared fixtures ──────────────────────────────────────────────────────────

// Valid UUID-v4 format: third group starts with [1-8], fourth group starts with [89ab]
export const IMAGE_ID = "00000000-0000-4000-8000-000000000001";
export const UPLOAD_ID = "00000000-0000-4000-8000-000000000099";

export const FIXTURES = {
	drawingTypes: [
		{
			drawing_type_id: 1,
			type_name: "composite",
			description: "",
			is_active: true,
		},
	],
	image: {
		image_id: IMAGE_ID,
		component_name: "Cooling System Assembly",
		drawing_type: {
			drawing_type_id: 1,
			type_name: "composite",
			description: "",
			is_active: true,
		},
		width_px: 800,
		height_px: 600,
		uploaded_at: "2024-01-01T00:00:00Z",
		thumbnail_url: null,
	},
	imageDetail: {
		image_id: IMAGE_ID,
		component_name: "Cooling System Assembly",
		drawing_type: {
			drawing_type_id: 1,
			type_name: "composite",
			description: "",
			is_active: true,
		},
		width_px: 800,
		height_px: 600,
		uploaded_at: "2024-01-01T00:00:00Z",
		thumbnail_url: null,
		image_svg:
			'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/>',
	},
	positions: [
		{
			fitting_position_id: "FP-PUMP-01-INLET",
			x_coordinate: 300,
			y_coordinate: 250,
			label_text: "FP-PUMP-01-INLET",
			is_active: true,
		},
	],
	positionDetail: {
		fitting_position_id: "FP-PUMP-01-INLET",
		label_text: "FP-PUMP-01-INLET",
		x_coordinate: 300,
		y_coordinate: 250,
		asset: {
			asset_record_id: "AR-001",
			high_level_component: "Cooling Pump",
			sub_system_name: "Primary Loop",
			sub_component_name: "Inlet Valve",
		},
		source_status: { asset: "ok" },
	},
	searchResponse: {
		query: "",
		image_id: IMAGE_ID,
		limit: 25,
		results: [],
		source_status: { internal: "ok", asset: "ok" },
		has_more: false,
		next_cursor: null,
		request_id: "test-request-id-001",
	},
	uploadSession: {
		upload_id: UPLOAD_ID,
		state: "initiated",
		file_name: "test.svg",
		error_message: "",
	},
	uploadComplete: {
		upload_id: UPLOAD_ID,
		image_id: IMAGE_ID,
		state: "completed",
	},
};

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
];

// ── MSW server instance ──────────────────────────────────────────────────────

export const server = setupServer(...handlers);
