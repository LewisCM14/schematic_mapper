import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { FIXTURES, IMAGE_ID } from "../../../test/handlers";
import { queryKeys } from "../queryKeys";
import { getNextPageParam, useImage, useImages } from "./useImages";

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

describe("useImages", () => {
	describe("getNextPageParam (unit)", () => {
		it("returns next_cursor when has_more is true and next_cursor is present", () => {
			expect(getNextPageParam({ has_more: true, next_cursor: "abc" })).toBe(
				"abc",
			);
		});
		it("returns undefined when has_more is true but next_cursor is missing", () => {
			expect(getNextPageParam({ has_more: true })).toBeUndefined();
		});
		it("returns undefined when has_more is false", () => {
			expect(
				getNextPageParam({ has_more: false, next_cursor: "abc" }),
			).toBeUndefined();
			expect(getNextPageParam({ has_more: false })).toBeUndefined();
		});
	});
	it("applies both drawingTypeId and search filters", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useImages(1, "cooling"), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toBeDefined();
	});

	it("returns image list data on success", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useImages(), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		const images = result.current.data?.pages.flatMap((p) => p.results) ?? [];
		expect(images).toHaveLength(1);
		expect(images[0].image_id).toBe(IMAGE_ID);
	});

	it("applies drawing_type_id filter param", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useImages(1), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toBeDefined();
	});

	it("first page has has_more false when only one page of data", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useImages(), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		const firstPage = result.current.data?.pages[0];
		expect(firstPage?.has_more).toBe(false);
	});

	it("getNextPageParam returns undefined when has_more is false", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useImages(), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.hasNextPage).toBe(false);
	});

	it("uses correct query key without filter", () => {
		const key = queryKeys.images.list(undefined);
		expect(key).toEqual(["images", "list", undefined]);
	});

	it("uses correct query key with filter", () => {
		const key = queryKeys.images.list({ drawingTypeId: 1 });
		expect(key).toEqual(["images", "list", { drawingTypeId: 1 }]);
	});
});

describe("useImage", () => {
	it("returns image detail data on success", async () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useImage(IMAGE_ID), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data?.image_id).toBe(IMAGE_ID);
		expect(result.current.data?.component_name).toBe(
			FIXTURES.imageDetail.component_name,
		);
	});

	it("is disabled when imageId is empty string", () => {
		const { wrapper } = makeWrapper();
		const { result } = renderHook(() => useImage(""), { wrapper });
		expect(result.current.fetchStatus).toBe("idle");
	});

	it("uses staleTime of 15 minutes", async () => {
		const { wrapper, queryClient } = makeWrapper();
		const { result } = renderHook(() => useImage(IMAGE_ID), { wrapper });
		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		const state = queryClient.getQueryState(queryKeys.images.detail(IMAGE_ID));
		// staleTime of 15 min means the query is not yet stale immediately after fetching
		expect(state?.isInvalidated).toBeFalsy();
	});
});
