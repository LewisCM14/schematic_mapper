import httpClient from "./httpClient";
import {
	BulkFittingPositionsResultSchema,
	DrawingTypeListSchema,
	FittingPositionDetailSchema,
	FittingPositionListSchema,
	HealthSchema,
	ImageDetailSchema,
	ImageListPageSchema,
	SearchResponseSchema,
	UploadCompleteResultSchema,
	UploadSessionSchema,
} from "./schemas";

export async function fetchHealth() {
	const response = await httpClient.get("/health");
	return HealthSchema.parse(response.data);
}

export async function fetchDrawingTypes() {
	const response = await httpClient.get("/drawing-types");
	return DrawingTypeListSchema.parse(response.data);
}

export async function fetchImages(params?: Record<string, string>) {
	const response = await httpClient.get("/images", { params });
	return ImageListPageSchema.parse(response.data);
}

export async function fetchImage(imageId: string) {
	const response = await httpClient.get(`/images/${imageId}`);
	return ImageDetailSchema.parse(response.data);
}

export async function fetchFittingPositions(imageId: string) {
	const response = await httpClient.get(`/images/${imageId}/fitting-positions`);
	return FittingPositionListSchema.parse(response.data);
}

export async function fetchFittingPositionDetails(fittingPositionId: string) {
	const response = await httpClient.get(
		`/fitting-positions/${fittingPositionId}/details`,
	);
	return FittingPositionDetailSchema.parse(response.data);
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchParams {
	imageId: string;
	query: string;
	sources?: string[];
	limit?: number;
	cursor?: string | null;
}

export async function fetchSearch({
	imageId,
	query,
	sources = ["internal", "asset"],
	limit = 25,
	cursor,
}: SearchParams) {
	const normalizedQuery = query.trim().toLowerCase();
	const params: Record<string, string> = {
		image_id: imageId,
		query: normalizedQuery,
		sources: sources.join(","),
		limit: String(limit),
	};
	if (cursor) params.cursor = cursor;
	const response = await httpClient.get("/search", { params });
	return SearchResponseSchema.parse(response.data);
}

// ── Admin upload ──────────────────────────────────────────────────────────────

export interface CreateUploadSessionParams {
	drawingTypeId: number;
	componentName: string;
	fileName: string;
	fileSize: number;
	expectedChecksum: string;
	idempotencyKey: string;
}

export async function createUploadSession(params: CreateUploadSessionParams) {
	const response = await httpClient.post("/admin/uploads", {
		drawing_type_id: params.drawingTypeId,
		component_name: params.componentName,
		file_name: params.fileName,
		file_size: params.fileSize,
		expected_checksum: params.expectedChecksum,
		idempotency_key: params.idempotencyKey,
	});
	return UploadSessionSchema.parse(response.data);
}

export async function uploadChunk(
	uploadId: string,
	partNumber: number,
	chunkData: string,
) {
	const response = await httpClient.put(
		`/admin/uploads/${uploadId}/parts/${partNumber}`,
		{ chunk_data: chunkData },
	);
	return response.data as {
		upload_id: string;
		part_number: number;
		state: string;
	};
}

export async function completeUpload(uploadId: string, idempotencyKey: string) {
	const response = await httpClient.post(
		`/admin/uploads/${uploadId}/complete`,
		{ idempotency_key: idempotencyKey },
	);
	return UploadCompleteResultSchema.parse(response.data);
}

export async function abortUpload(uploadId: string) {
	await httpClient.delete(`/admin/uploads/${uploadId}`);
}

export async function deleteFittingPosition(fittingPositionId: string) {
	await httpClient.delete(`/admin/fitting-positions/${fittingPositionId}`);
}

export interface BulkFittingPositionItem {
	fitting_position_id: string;
	label_text: string;
	x_coordinate: number;
	y_coordinate: number;
	width: number;
	height: number;
}

export async function saveBulkFittingPositions(
	imageId: string,
	fittingPositions: BulkFittingPositionItem[],
) {
	const response = await httpClient.post("/admin/fitting-positions/bulk", {
		image_id: imageId,
		fitting_positions: fittingPositions,
	});
	return BulkFittingPositionsResultSchema.parse(response.data);
}
