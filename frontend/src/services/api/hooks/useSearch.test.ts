import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { FIXTURES, IMAGE_ID, server } from "../../../test/handlers";
import { queryKeys } from "../queryKeys";
import { useSearch } from "./useSearch";

function makeWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return {
		wrapper: ({ children }: { children: React.ReactNode }) =>
			createElement(QueryClientProvider, { client: queryClient }, children),
		queryClient,
	};
}

describe("useSearch", () => {
	it("is disabled when imageId is empty", () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useSearch("", "pump"), { wrapper });
		expect(result.current.fetchStatus).toBe("idle");
	});

	it("is disabled when query is shorter than 2 characters", () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useSearch(IMAGE_ID, "p"), { wrapper });
		expect(result.current.fetchStatus).toBe("idle");
	});

	it("is disabled when query is empty", () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useSearch(IMAGE_ID, ""), { wrapper });
		expect(result.current.fetchStatus).toBe("idle");
	});

	it("fetches when imageId and query (>=2 chars) are present", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useSearch(IMAGE_ID, "pump"), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.pages).toHaveLength(1);
	});

	it("returns page data from search response", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useSearch(IMAGE_ID, "pump"), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		const firstPage = result.current.data?.pages[0];
		expect(firstPage?.image_id).toBe(IMAGE_ID);
		expect(firstPage?.has_more).toBe(false);
	});

	it("getNextPageParam returns undefined when has_more is false", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useSearch(IMAGE_ID, "pump"), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.hasNextPage).toBe(false);
	});

	it("getNextPageParam returns cursor when has_more is true", async () => {
		server.use(
			http.get("/api/search", () =>
				HttpResponse.json({
					...FIXTURES.searchResponse,
					has_more: true,
					next_cursor: "eyJvZmZzZXQiOjI1fQ==",
				}),
			),
		);
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useSearch(IMAGE_ID, "pump"), {
			wrapper,
		});
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.hasNextPage).toBe(true);
	});

	it("includes sources in the query key", () => {
		const key = queryKeys.search(IMAGE_ID, "pump", ["internal"], 25);
		expect(key).toEqual(["search", IMAGE_ID, "pump", ["internal"], 25]);
	});

	it("normalizes query in query key", () => {
		const key1 = queryKeys.search(IMAGE_ID, "  Pump ", ["internal"], 25);
		const key2 = queryKeys.search(IMAGE_ID, "pump", ["internal"], 25);
		expect(key1).toEqual(key2);
	});

	it("toggling sources re-triggers the query", async () => {
		const { wrapper, queryClient } = makeWrapper();
		const { result, rerender } = renderHook(
			({ sources }) => useSearch(IMAGE_ID, "pump", sources),
			{
				wrapper,
				initialProps: { sources: ["internal", "asset"] },
			},
		);
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Change sources to only internal
		rerender({ sources: ["internal"] });
		// The new query key should trigger a new fetch
		const cache = queryClient.getQueryCache();
		const keys = cache.getAll().map((q) => q.queryKey);
		const hasInternalOnly = keys.some(
			(k) =>
				Array.isArray(k[3]) &&
				(k[3] as string[]).length === 1 &&
				(k[3] as string[])[0] === "internal",
		);
		expect(hasInternalOnly).toBe(true);
	});
});
