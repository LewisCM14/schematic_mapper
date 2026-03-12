// 100% branch/line: test the fallback for allResults.map (line 93) when data.pages is undefined
it("renders no results if data.pages is undefined (explicit)", async () => {
	vi.doMock("../../services/api/hooks/useSearch", () => ({
		useSearch: () => ({
			isLoading: false,
			isError: false,
			isFetchingNextPage: false,
			hasNextPage: false,
			fetchNextPage: vi.fn(),
			data: { pages: undefined },
		}),
	}));
	const { default: Panel } = await import("./SearchResultsPanel");
	await renderPanelAsync(Panel, { query: "abc" });
	// Should not throw, and should not render any result items
	expect(screen.queryByText(/No results found/i)).not.toBeInTheDocument();
	vi.resetModules();
});

import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import SearchResultsPanel from "./SearchResultsPanel";

// Helper for async tests with dynamic import
async function renderPanelAsync<T>(Panel: FC<T>, props: Partial<T> = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	const PanelTyped = Panel as FC<Record<string, unknown>>;
	return render(
		<ThemeProvider theme={theme}>
			<QueryClientProvider client={client}>
				<PanelTyped imageId="img-1" onSelectFp={vi.fn()} {...props} />
			</QueryClientProvider>
		</ThemeProvider>,
	);
}

describe("SearchResultsPanel", () => {
	it("does not call onSearchMetadata if data.pages is empty", async () => {
		const onSearchMetadata = vi.fn();
		vi.doMock("../../services/api/hooks/useSearch", () => ({
			useSearch: () => ({
				isLoading: false,
				isError: false,
				isFetchingNextPage: false,
				hasNextPage: false,
				data: { pages: [] },
			}),
		}));
		const { default: Panel } = await import("./SearchResultsPanel");
		await renderPanelAsync(Panel, { query: "abc", onSearchMetadata });
		// onSearchMetadata should not be called because pages is empty
		expect(onSearchMetadata).not.toHaveBeenCalled();
		vi.resetModules();
	});
	it("renders the search input with search icon", () => {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});
		render(
			<ThemeProvider theme={theme}>
				<QueryClientProvider client={client}>
					<SearchResultsPanel
						imageId="00000000-0000-4000-8000-000000000001"
						onSelectFp={vi.fn()}
					/>
				</QueryClientProvider>
			</ThemeProvider>,
		);
		expect(
			screen.getByRole("textbox", { name: /search fitting positions/i }),
		).toBeInTheDocument();
		expect(document.querySelector("[data-testid='SearchIcon']")).toBeTruthy();
	});

	it("shows loading spinner when loading and query >= 2", async () => {
		vi.doMock("../../services/api/hooks/useSearch", () => ({
			useSearch: () => ({
				isLoading: true,
				data: undefined,
				isFetchingNextPage: false,
				hasNextPage: false,
				fetchNextPage: vi.fn(),
				isError: false,
			}),
		}));
		const { default: Panel } = await import("./SearchResultsPanel");
		await renderPanelAsync(Panel, { query: "ab" });
		expect(screen.queryByText(/No results found/i)).toBeInTheDocument();
		const spinner = screen.getByRole("progressbar");
		expect(spinner).toBeInTheDocument();
		vi.resetModules();
	});

	it("shows error alert when isError", async () => {
		vi.doMock("../../services/api/hooks/useSearch", () => ({
			useSearch: () => ({
				isError: true,
				isLoading: false,
				data: undefined,
				isFetchingNextPage: false,
				hasNextPage: false,
				fetchNextPage: vi.fn(),
			}),
		}));
		const { default: Panel } = await import("./SearchResultsPanel");
		await renderPanelAsync(Panel, { query: "abc" });
		expect(screen.getByText(/search failed/i)).toBeInTheDocument();
		vi.resetModules();
	});

	it("shows degraded warning when asset source is degraded", async () => {
		vi.doMock("../../services/api/hooks/useSearch", () => ({
			useSearch: () => ({
				isLoading: false,
				isError: false,
				isFetchingNextPage: false,
				hasNextPage: false,
				fetchNextPage: vi.fn(),
				data: {
					pages: [{ source_status: { asset: "degraded" }, results: [] }],
				},
			}),
		}));
		const { default: Panel } = await import("./SearchResultsPanel");
		await renderPanelAsync(Panel, { query: "abc" });
		expect(screen.getByText(/asset source unavailable/i)).toBeInTheDocument();
		vi.resetModules();
	});

	it("shows min-chars hint when query is 1 char", async () => {
		vi.doMock("../../services/api/hooks/useSearch", () => ({
			useSearch: () => ({
				isLoading: false,
				isError: false,
				data: undefined,
				isFetchingNextPage: false,
				hasNextPage: false,
				fetchNextPage: vi.fn(),
			}),
		}));
		const { default: Panel } = await import("./SearchResultsPanel");
		await renderPanelAsync(Panel, { query: "a" });
		expect(
			screen.getByText((c) => c.includes("Enter at least 2 characters")),
		).toBeInTheDocument();
		vi.resetModules();
	});

	it("shows no results found when query >= 2 and no results", async () => {
		vi.doMock("../../services/api/hooks/useSearch", () => ({
			useSearch: () => ({
				isLoading: false,
				isError: false,
				isFetchingNextPage: false,
				hasNextPage: false,
				fetchNextPage: vi.fn(),
				data: { pages: [{ results: [], source_status: {} }] },
			}),
		}));
		const { default: Panel } = await import("./SearchResultsPanel");
		await renderPanelAsync(Panel, { query: "abc" });
		expect(
			Array.from(document.querySelectorAll("body *")).some((el) =>
				el.textContent?.includes("No results found"),
			),
		).toBe(true);
		vi.resetModules();
	});

	it("calls onSelectFp when a result is clicked", async () => {
		const onSelectFp = vi.fn();
		vi.doMock("../../services/api/hooks/useSearch", () => ({
			useSearch: () => ({
				isLoading: false,
				isError: false,
				isFetchingNextPage: false,
				hasNextPage: false,
				fetchNextPage: vi.fn(),
				data: {
					pages: [
						{
							results: [
								{
									fitting_position_id: "fp1",
									x_coordinate: 1,
									y_coordinate: 2,
									label_text: "Fitting Position 1",
									image_id: "00000000-0000-0000-0000-000000000000",
									component_name: "Component",
									matched_source: "internal",
									matched_field: "label_text",
									match_type: "exact",
								},
							],
							source_status: {},
							request_id: "req-1",
						},
					],
				},
			}),
		}));
		const { default: Panel } = await import("./SearchResultsPanel");
		await renderPanelAsync(Panel, { query: "abc", onSelectFp });
		const allButtons = screen.getAllByRole("button");
		const resultBtn = allButtons.find((btn) =>
			btn.textContent?.includes("Fitting Position 1"),
		);
		if (resultBtn) {
			await userEvent.click(resultBtn);
		}
		expect(onSelectFp).toHaveBeenCalledWith("fp1", 1, 2);
		vi.resetModules();
	});

	it("calls onSearchMetadata when data changes", async () => {
		const onSearchMetadata = vi.fn();
		vi.doMock("../../services/api/hooks/useSearch", () => ({
			useSearch: () => ({
				isLoading: false,
				isError: false,
				isFetchingNextPage: false,
				hasNextPage: false,
				fetchNextPage: vi.fn(),
				data: {
					pages: [
						{
							results: [],
							source_status: { asset: "ok" },
							request_id: "req-1",
						},
					],
				},
			}),
		}));
		const { default: Panel } = await import("./SearchResultsPanel");
		await renderPanelAsync(Panel, { query: "abc", onSearchMetadata });
		await waitFor(() => {
			expect(onSearchMetadata).toHaveBeenCalledWith(
				{ asset: "ok" },
				"req-1",
				expect.any(Date),
			);
		});
		vi.resetModules();
	});

	it("triggers fetchNextPage when sentinel is intersected and hasNextPage", async () => {
		// Mock IntersectionObserver
		class MockIntersectionObserver {
			private _cb: (entries: unknown[]) => void;
			constructor(cb: (entries: unknown[]) => void) {
				this._cb = cb;
			}
			observe() {
				this._cb([{ isIntersecting: true }]);
			}
			unobserve() {}
			disconnect() {}
		}
		// @ts-expect-error
		global.IntersectionObserver = MockIntersectionObserver;
		const fetchNextPage = vi.fn();
		vi.doMock("../../services/api/hooks/useSearch", () => ({
			useSearch: () => ({
				isLoading: false,
				isError: false,
				isFetchingNextPage: false,
				hasNextPage: true,
				fetchNextPage,
				data: { pages: [{ results: [], source_status: {} }] },
			}),
		}));
		const { default: Panel } = await import("./SearchResultsPanel");
		await renderPanelAsync(Panel, { query: "abc" });
		expect(fetchNextPage).toHaveBeenCalled();
		vi.resetModules();
	});

	// 100% branch/line: test the fallback for allResults.map (line 93)
	it("renders no results if data.pages is undefined", async () => {
		vi.doMock("../../services/api/hooks/useSearch", () => ({
			useSearch: () => ({
				isLoading: false,
				isError: false,
				isFetchingNextPage: false,
				hasNextPage: false,
				fetchNextPage: vi.fn(),
				data: undefined,
			}),
		}));
		const { default: Panel } = await import("./SearchResultsPanel");
		await renderPanelAsync(Panel, { query: "abc" });
		// Should not throw, and should not render any result items
		expect(screen.queryByText(/No results found/i)).toBeInTheDocument();
		vi.resetModules();
	});
});
