import { z } from "zod";
import httpClient from "./httpClient";

export const HealthSchema = z.object({
	status: z.string(),
	database: z.string(),
});

export type Health = z.infer<typeof HealthSchema>;

export async function fetchHealth(): Promise<Health> {
	const response = await httpClient.get("/health");
	return HealthSchema.parse(response.data);
}
