/**
 * fixtures.ts
 *
 * Shared static test data for the Schematic Mapper frontend test suite.
 *
 * - Used by MSW handlers and tests to provide consistent, predictable API responses.
 * - Includes representative objects for images, drawing types, fitting positions, uploads, and search results.
 * - All IDs are static and deterministic for easy assertions in tests.
 *
 * This file enables fast, reliable, and isolated frontend tests by decoupling from real backend data.
 */

// Static UUIDs for use in all test fixtures
export const IMAGE_ID = "00000000-0000-4000-8000-000000000001";
export const UPLOAD_ID = "00000000-0000-4000-8000-000000000099";

export const FIXTURES = {
	// List of available drawing types (for dropdowns, etc.)
	drawingTypes: [
		{
			drawing_type_id: 1,
			type_name: "composite",
			description: "",
			is_active: true,
		},
	],

	// Minimal image object (for image list responses)
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

	// Full image detail (for image detail page)
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

	// List of fitting positions for an image
	positions: [
		{
			fitting_position_id: "FP-PUMP-01-INLET",
			x_coordinate: 300,
			y_coordinate: 250,
			width: 0,
			height: 0,
			label_text: "FP-PUMP-01-INLET",
			is_active: true,
		},
	],

	// Full detail for a single fitting position
	positionDetail: {
		fitting_position_id: "FP-PUMP-01-INLET",
		label_text: "FP-PUMP-01-INLET",
		x_coordinate: 300,
		y_coordinate: 250,
		width: 0,
		height: 0,
		asset: {
			asset_record_id: "AR-001",
			high_level_component: "Cooling Pump",
			sub_system_name: "Primary Loop",
			sub_component_name: "Inlet Valve",
		},
		source_status: { asset: "ok" },
	},

	// Search API response (empty results)
	searchResponse: {
		query: "",
		image_id: IMAGE_ID,
		limit: 25,
		results: [],
		source_status: { internal: "ok", asset: "ok" },
		has_more: false,
		next_cursor: undefined,
		request_id: "test-request-id-001",
	},

	// Upload session object (for upload API)
	uploadSession: {
		upload_id: UPLOAD_ID,
		state: "initiated",
		file_name: "test.svg",
		error_message: "",
	},

	// Upload complete response
	uploadComplete: {
		upload_id: UPLOAD_ID,
		image_id: IMAGE_ID,
		state: "completed",
	},
};
