import { z } from "zod";

export const HealthSchema = z.object({
	status: z.string(),
	database: z.string(),
});

export const DrawingTypeSchema = z.object({
	drawing_type_id: z.number(),
	type_name: z.string(),
	description: z.string(),
	is_active: z.boolean(),
});

export const ImageSchema = z.object({
	image_id: z.string().uuid(),
	drawing_type: DrawingTypeSchema,
	component_name: z.string(),
	width_px: z.number(),
	height_px: z.number(),
	uploaded_at: z.string(),
	thumbnail_url: z.string().url().nullable(),
});

export const ImageDetailSchema = ImageSchema.extend({
	image_svg: z.string(),
});

export const FittingPositionSchema = z.object({
	fitting_position_id: z.string(),
	x_coordinate: z.coerce.number(),
	y_coordinate: z.coerce.number(),
	label_text: z.string(),
	is_active: z.boolean(),
});

export const AssetInfoSchema = z.object({
	asset_record_id: z.string(),
	high_level_component: z.string(),
	sub_system_name: z.string(),
	sub_component_name: z.string(),
});

export const FittingPositionDetailSchema = z.object({
	fitting_position_id: z.string(),
	label_text: z.string(),
	x_coordinate: z.coerce.number(),
	y_coordinate: z.coerce.number(),
	asset: AssetInfoSchema.nullable(),
	source_status: z.record(z.string(), z.string()),
});

// ── Search ────────────────────────────────────────────────────────────────────

export const SearchResultItemSchema = z.object({
	fitting_position_id: z.string(),
	label_text: z.string(),
	image_id: z.string().uuid(),
	x_coordinate: z.coerce.number(),
	y_coordinate: z.coerce.number(),
	component_name: z.string(),
	matched_source: z.string(),
	matched_field: z.string(),
	match_type: z.enum(["exact", "prefix", "partial"]),
});

export const SearchResponseSchema = z.object({
	query: z.string(),
	image_id: z.string().uuid(),
	limit: z.number(),
	results: z.array(SearchResultItemSchema),
	source_status: z.record(z.string(), z.string()),
	has_more: z.boolean(),
	next_cursor: z.string().nullable(),
	request_id: z.string(),
});

// ── Admin upload ──────────────────────────────────────────────────────────────

export const UploadSessionSchema = z.object({
	upload_id: z.string().uuid(),
	state: z.string(),
	file_name: z.string(),
	error_message: z.string(),
});

export const UploadCompleteResultSchema = z.object({
	upload_id: z.string().uuid(),
	image_id: z.string().uuid(),
	state: z.string(),
});

export const BulkFittingPositionsResultSchema = z.object({
	created: z.number(),
	updated: z.number(),
});

export const ImageListPageSchema = z.object({
	results: z.array(ImageSchema),
	has_more: z.boolean(),
	next_cursor: z.string().nullable(),
});

export const FittingPositionListSchema = z.array(FittingPositionSchema);

export type Health = z.infer<typeof HealthSchema>;
export type DrawingType = z.infer<typeof DrawingTypeSchema>;
export type Image = z.infer<typeof ImageSchema>;
export type ImageDetail = z.infer<typeof ImageDetailSchema>;
export type FittingPosition = z.infer<typeof FittingPositionSchema>;
export type AssetInfo = z.infer<typeof AssetInfoSchema>;
export type FittingPositionDetail = z.infer<typeof FittingPositionDetailSchema>;
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type UploadSession = z.infer<typeof UploadSessionSchema>;
export type UploadCompleteResult = z.infer<typeof UploadCompleteResultSchema>;
export type BulkFittingPositionsResult = z.infer<
	typeof BulkFittingPositionsResultSchema
>;
