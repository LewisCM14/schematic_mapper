import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { IMAGE_ID, server, UPLOAD_ID } from "../../test/handlers";

import {
	abortUpload,
	deleteFittingPosition,
	saveBulkFittingPositions,
} from "./endpoints";

describe("endpoints admin helpers", () => {
	it("calls abortUpload and receives 204", async () => {
		let called = false;
		server.use(
			http.delete("/api/admin/uploads/:id", () => {
				called = true;
				return new HttpResponse(null, { status: 204 });
			}),
		);
		await expect(abortUpload(UPLOAD_ID)).resolves.toBeUndefined();
		expect(called).toBe(true);
	});

	it("calls deleteFittingPosition and receives 204", async () => {
		let called = false;
		server.use(
			http.delete("/api/admin/fitting-positions/:id", ({ params }) => {
				called = true;
				expect(params.id).toBe("FP-PUMP-01-INLET");
				return new HttpResponse(null, { status: 204 });
			}),
		);
		await expect(
			deleteFittingPosition("FP-PUMP-01-INLET"),
		).resolves.toBeUndefined();
		expect(called).toBe(true);
	});

	it("calls saveBulkFittingPositions and parses result", async () => {
		let called = false;
		const fittingPositions = [
			{
				fitting_position_id: "FP-PUMP-01-INLET",
				label_text: "FP-PUMP-01-INLET",
				x_coordinate: 300,
				y_coordinate: 250,
				width: 0,
				height: 0,
			},
		];
		server.use(
			http.post("/api/admin/fitting-positions/bulk", async ({ request }) => {
				called = true;
				const body = await request.json();
				if (
					body &&
					typeof body === "object" &&
					!Array.isArray(body) &&
					"image_id" in body &&
					"fitting_positions" in body
				) {
					const typedBody = body as Record<string, unknown>;
					expect(typedBody.image_id).toBe(IMAGE_ID);
					expect(
						Array.isArray(typedBody.fitting_positions)
							? typedBody.fitting_positions
							: [],
					).toHaveLength(1);
				} else {
					throw new Error("Unexpected body type");
				}
				return HttpResponse.json({ created: 1, updated: 0 });
			}),
		);
		const result = await saveBulkFittingPositions(IMAGE_ID, fittingPositions);
		expect(result).toEqual({ created: 1, updated: 0 });
		expect(called).toBe(true);
	});
});
