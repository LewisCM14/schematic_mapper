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
	drawing_type_id: z.number(),
	component_name: z.string(),
	content_hash: z.string(),
	width_px: z.number(),
	height_px: z.number(),
	uploaded_at: z.string(),
});

export const FittingPositionSchema = z.object({
	fitting_position_id: z.string(),
	image_id: z.string().uuid(),
	x_coordinate: z.number(),
	y_coordinate: z.number(),
	label_text: z.string(),
	is_active: z.boolean(),
});

export const ImageListSchema = z.array(ImageSchema);
export const FittingPositionListSchema = z.array(FittingPositionSchema);

export type Health = z.infer<typeof HealthSchema>;
export type DrawingType = z.infer<typeof DrawingTypeSchema>;
export type Image = z.infer<typeof ImageSchema>;
export type FittingPosition = z.infer<typeof FittingPositionSchema>;
