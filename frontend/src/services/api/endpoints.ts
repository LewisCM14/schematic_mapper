import httpClient from "./httpClient";
import {
	FittingPositionListSchema,
	HealthSchema,
	ImageListSchema,
	ImageSchema,
} from "./schemas";

export async function fetchHealth() {
	const response = await httpClient.get("/health");
	return HealthSchema.parse(response.data);
}

export async function fetchImages(params?: Record<string, string>) {
	const response = await httpClient.get("/images", { params });
	return ImageListSchema.parse(response.data);
}

export async function fetchImage(imageId: string) {
	const response = await httpClient.get(`/images/${imageId}`);
	return ImageSchema.parse(response.data);
}

export async function fetchFittingPositions(imageId: string) {
	const response = await httpClient.get(`/images/${imageId}/fitting-positions`);
	return FittingPositionListSchema.parse(response.data);
}
