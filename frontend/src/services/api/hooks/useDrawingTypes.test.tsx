import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useDrawingTypes } from "./useDrawingTypes";

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	};
}

describe("useDrawingTypes", () => {
	it("fetches drawing types from GET /api/drawing-types", async () => {
		const { result } = renderHook(() => useDrawingTypes(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		const data = result.current.data;
		expect(Array.isArray(data)).toBe(true);
		expect(data).toHaveLength(1);
		expect(data![0].type_name).toBe("composite");
	});

	it("applies staleTime of 30 minutes and gcTime of 60 minutes", () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});
		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		renderHook(() => useDrawingTypes(), { wrapper });

		const cache = queryClient.getQueryCache();
		const query = cache.find({ queryKey: ["drawing-types"] });
		expect(query).toBeDefined();
		const opts = query!.options as Record<string, unknown>;
		expect(opts.staleTime).toBe(30 * 60 * 1000);
		expect(opts.gcTime).toBe(60 * 60 * 1000);
	});

	it("is enabled unconditionally", () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});
		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		renderHook(() => useDrawingTypes(), { wrapper });

		const cache = queryClient.getQueryCache();
		const query = cache.find({ queryKey: ["drawing-types"] });
		expect(query).toBeDefined();
		// enabled defaults to true when not specified
		const opts = query!.options as Record<string, unknown>;
		expect(opts.enabled).not.toBe(false);
	});
});
