import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { FIXTURES, server } from "../../test/handlers";
import { fetchSearch } from "./endpoints";

describe("fetchSearch", () => {
	it("sends a trimmed, lowercased query to the API", async () => {
		let capturedQuery = "";

		server.use(
			http.get("/api/search", ({ request }) => {
				const url = new URL(request.url);
				capturedQuery = url.searchParams.get("query") ?? "";
				return HttpResponse.json(FIXTURES.searchResponse);
			}),
		);

		await fetchSearch({
			imageId: FIXTURES.searchResponse.image_id,
			query: "  PUMP inlet  ",
		});

		expect(capturedQuery).toBe("pump inlet");
	});
});
