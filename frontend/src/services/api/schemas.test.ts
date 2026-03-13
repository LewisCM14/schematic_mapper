import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
	FittingPositionDetailSchema,
	FittingPositionSchema,
	ImageDetailSchema,
	ImageSchema,
	SearchResponseSchema,
	UploadSessionSchema,
} from "./schemas";

// A valid UUID-v4 (third group starts [1-8], fourth starts [89ab])
const VALID_UUID = "00000000-0000-4000-8000-000000000001";

const VALID_DRAWING_TYPE = {
	drawing_type_id: 1,
	type_name: "composite",
	description: "",
	is_active: true,
};

const VALID_IMAGE = {
	image_id: VALID_UUID,
	drawing_type: VALID_DRAWING_TYPE,
	component_name: "Cooling Assembly",
	width_px: 800,
	height_px: 600,
	uploaded_at: "2024-01-01T00:00:00Z",
	thumbnail_url: null,
};

describe("ImageSchema", () => {
	it("parses a valid image payload", () => {
		expect(() => ImageSchema.parse(VALID_IMAGE)).not.toThrow();
	});

	it("returns shaped data", () => {
		const result = ImageSchema.parse(VALID_IMAGE);
		expect(result.image_id).toBe(VALID_UUID);
		expect(result.component_name).toBe("Cooling Assembly");
	});

	it("throws when image_id is missing", () => {
		const { image_id: _omit, ...rest } = VALID_IMAGE;
		expect(() => ImageSchema.parse(rest)).toThrow();
	});

	it("throws when image_id is not a UUID", () => {
		expect(() =>
			ImageSchema.parse({ ...VALID_IMAGE, image_id: "not-a-uuid" }),
		).toThrow();
	});

	it("throws when drawing_type is missing", () => {
		const { drawing_type: _omit, ...rest } = VALID_IMAGE;
		expect(() => ImageSchema.parse(rest)).toThrow();
	});
});

describe("ImageDetailSchema", () => {
	it("parses a valid image detail payload", () => {
		const payload = { ...VALID_IMAGE, image_svg: "<svg/>" };
		expect(() => ImageDetailSchema.parse(payload)).not.toThrow();
	});

	it("throws when image_svg is missing", () => {
		expect(() => ImageDetailSchema.parse(VALID_IMAGE)).toThrow();
	});
});

describe("FittingPositionSchema", () => {
	const VALID_FP = {
		fitting_position_id: "FP-001",
		x_coordinate: 100,
		y_coordinate: 200,
		width: 50,
		height: 25,
		label_text: "pump-inlet",
		is_active: true,
	};

	it("parses a valid fitting position", () => {
		const result = FittingPositionSchema.parse(VALID_FP);
		expect(result.fitting_position_id).toBe("FP-001");
		expect(result.x_coordinate).toBe(100);
	});

	it("coerces string coordinates to numbers", () => {
		const result = FittingPositionSchema.parse({
			...VALID_FP,
			x_coordinate: "100.5",
			y_coordinate: "200.0",
			width: "50.5",
			height: "25.0",
		});
		expect(result.x_coordinate).toBe(100.5);
		expect(result.y_coordinate).toBe(200.0);
		expect(result.width).toBe(50.5);
		expect(result.height).toBe(25.0);
	});

	it("throws when x_coordinate is not numeric", () => {
		expect(() =>
			FittingPositionSchema.parse({ ...VALID_FP, x_coordinate: "notanumber" }),
		).toThrow();
	});
	it("throws when width is not numeric", () => {
		expect(() =>
			FittingPositionSchema.parse({ ...VALID_FP, width: "notanumber" }),
		).toThrow();
	});
	it("throws when height is not numeric", () => {
		expect(() =>
			FittingPositionSchema.parse({ ...VALID_FP, height: "notanumber" }),
		).toThrow();
	});
});

describe("SearchResponseSchema", () => {
	const VALID_SEARCH_RESPONSE = {
		query: "pump",
		image_id: VALID_UUID,
		limit: 25,
		results: [],
		source_status: { internal: "ok" },
		has_more: false,
		next_cursor: undefined,
		request_id: "req-001",
	};

	it("throws when match_type is not in enum", () => {
		const badResult = {
			...VALID_SEARCH_RESPONSE,
			results: [
				{
					fitting_position_id: "FP-001",
					label_text: "pump-inlet",
					image_id: VALID_UUID,
					x_coordinate: 100,
					y_coordinate: 200,
					component_name: "Cooling Assembly",
					matched_source: "internal",
					matched_field: "label_text",
					match_type: "fuzzy",
				},
			],
		};
		expect(() => SearchResponseSchema.parse(badResult)).toThrow();
	});

	it("throws when source_status is missing", () => {
		const { source_status: _omit, ...rest } = VALID_SEARCH_RESPONSE;
		expect(() => SearchResponseSchema.parse(rest)).toThrow();
	});

	it("accepts null and non-null next_cursor", () => {
		expect(() =>
			SearchResponseSchema.parse({
				...VALID_SEARCH_RESPONSE,
				has_more: true,
				next_cursor: "eyJvZmZzZXQiOjI1fQ==",
			}),
		).not.toThrow();
	});
});

describe("UploadSessionSchema", () => {
	const VALID_SESSION = {
		upload_id: VALID_UUID,
		state: "initiated",
		file_name: "test.svg",
		error_message: "",
	};

	it("parses a valid upload session", () => {
		const result = UploadSessionSchema.parse(VALID_SESSION);
		expect(result.upload_id).toBe(VALID_UUID);
	});

	it("throws when upload_id is missing", () => {
		const { upload_id: _omit, ...rest } = VALID_SESSION;
		expect(() => UploadSessionSchema.parse(rest)).toThrow();
	});

	it("throws when upload_id is not a UUID", () => {
		expect(() =>
			UploadSessionSchema.parse({ ...VALID_SESSION, upload_id: "not-a-uuid" }),
		).toThrow();
	});

	it("throws when error_message is missing", () => {
		const { error_message: _omit, ...rest } = VALID_SESSION;
		expect(() => UploadSessionSchema.parse(rest)).toThrow();
	});
});

describe("FittingPositionDetailSchema", () => {
	const VALID_DETAIL = {
		fitting_position_id: "FP-001",
		label_text: "pump-inlet",
		x_coordinate: 100,
		y_coordinate: 200,
		width: 50,
		height: 25,
		asset: null,
		source_status: { asset: "ok" },
	};

	it("parses a valid detail with null asset", () => {
		expect(() => FittingPositionDetailSchema.parse(VALID_DETAIL)).not.toThrow();
	});

	it("parses a valid detail with asset data", () => {
		const withAsset = {
			...VALID_DETAIL,
			asset: {
				asset_record_id: "AR-001",
				high_level_component: "Cooling Pump",
				sub_system_name: "Primary Loop",
				sub_component_name: "Inlet Valve",
			},
		};
		expect(() => FittingPositionDetailSchema.parse(withAsset)).not.toThrow();
	});

	it("throws when source_status is missing", () => {
		const { source_status: _omit, ...rest } = VALID_DETAIL;
		expect(() => FittingPositionDetailSchema.parse(rest)).toThrow();
	});
});

describe("Zod parse failure integration", () => {
	it("surfaces a ZodError for malformed image response", () => {
		const malformed = {
			image_id: "not-a-uuid",
			component_name: 123,
		};
		expect(() => ImageDetailSchema.parse(malformed)).toThrow(ZodError);
	});

	it("surfaces a ZodError for malformed search response", () => {
		const malformed = {
			query: "pump",
			results: "not-an-array",
		};
		expect(() => SearchResponseSchema.parse(malformed)).toThrow(ZodError);
	});

	it("ZodError contains structured issue details", () => {
		const malformed = { image_id: "bad" };
		try {
			ImageSchema.parse(malformed);
			expect.fail("Should have thrown");
		} catch (err) {
			expect(err).toBeInstanceOf(ZodError);
			const zodErr = err as ZodError;
			expect(zodErr.issues.length).toBeGreaterThan(0);
			expect(zodErr.issues[0].path).toBeDefined();
		}
	});
});
