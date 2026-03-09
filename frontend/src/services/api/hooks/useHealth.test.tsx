import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/handlers";
import { useHealth } from "./useHealth";

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

describe("useHealth", () => {
	it("fetches health from GET /api/health and returns parsed data", async () => {
		server.use(
			http.get("/api/health", () =>
				HttpResponse.json({ status: "ok", database: "connected" }),
			),
		);

		const { result } = renderHook(() => useHealth(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual({
			status: "ok",
			database: "connected",
		});
	});

	it("is enabled unconditionally", () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});
		const wrapper = ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);

		renderHook(() => useHealth(), { wrapper });

		const cache = queryClient.getQueryCache();
		const query = cache.find({ queryKey: ["health"] });
		expect(query).toBeDefined();
		const opts = query!.options as Record<string, unknown>;
		expect(opts.enabled).not.toBe(false);
	});
});
