import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { IMAGE_ID } from "../../../test/handlers";
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
		renderHook(() => useSearch(IMAGE_ID, ""), { wrapper });
	});

	it("normalizes query in query key", () => {
		const key1 = queryKeys.search(IMAGE_ID, "  Pump ", ["internal"], 25);
		const key2 = queryKeys.search(IMAGE_ID, "pump", ["internal"], 25);
		expect(key1).toEqual(key2);
	});
});
