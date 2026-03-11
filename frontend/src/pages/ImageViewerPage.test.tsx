import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIXTURES, IMAGE_ID, server } from "../test/handlers";
import theme from "../theme";
import ImageViewerPage from "./ImageViewerPage";

function LocationProbe() {
	const location = useLocation();
	return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>;
}

function getProbeSearchParams() {
	const probeText = screen.getByTestId("location-probe").textContent ?? "";
	return new URL(`http://localhost${probeText}`).searchParams;
}

function renderPage(imageId = IMAGE_ID, search = "") {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return render(
		<ThemeProvider theme={theme}>
			<MemoryRouter initialEntries={[`/viewer/${imageId}${search}`]}>
				<QueryClientProvider client={client}>
					<LocationProbe />
					<Routes>
						<Route path="/viewer/:imageId" element={<ImageViewerPage />} />
						<Route path="/" element={<div>Home</div>} />
					</Routes>
				</QueryClientProvider>
			</MemoryRouter>
		</ThemeProvider>,
	);
}

describe("ImageViewerPage", () => {
	beforeEach(() => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("redirects to / when imageId is missing", () => {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});
		render(
			<ThemeProvider theme={theme}>
				<MemoryRouter initialEntries={["/viewer/"]}>
					<QueryClientProvider client={client}>
						<Routes>
							<Route path="/viewer/" element={<ImageViewerPage />} />
							<Route path="/" element={<div>Home</div>} />
						</Routes>
					</QueryClientProvider>
				</MemoryRouter>
			</ThemeProvider>,
		);
		expect(screen.getByText("Home")).toBeInTheDocument();
	});

	it("shows image heading when data loads", async () => {
		renderPage();
		expect(screen.getByText("Schematic Mapper")).toBeInTheDocument();
		await waitFor(() => {
			expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument();
		});
	});

	it("renders POI marker pins", async () => {
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "FP-PUMP-01-INLET" }),
			).toBeInTheDocument();
		});
	});

	it("keeps saved rectangle areas interactive without rendering them visibly", async () => {
		server.use(
			http.get("/api/images/:imageId/fitting-positions", () =>
				HttpResponse.json([
					{
						fitting_position_id: "FP-RECT-01",
						x_coordinate: 300,
						y_coordinate: 250,
						width: 80,
						height: 40,
						label_text: "FP-RECT-01",
						is_active: true,
					},
				]),
			),
		);
		renderPage();
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "FP-RECT-01" })).toBeInTheDocument();
		});
		expect(screen.queryByLabelText("rectangle FP-RECT-01")).not.toBeInTheDocument();
	});

	it("shows error when image fails to load", async () => {
		server.use(
			http.get(
				"/api/images/:imageId",
				() => new HttpResponse(null, { status: 404 }),
			),
		);
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByText("Failed to load schematic image."),
			).toBeInTheDocument();
		});
	});

	it("shows notice and redirects to / when imageId is invalid UUID format", async () => {
		renderPage("not-a-real-uuid");

		await waitFor(() => {
			expect(
				screen.getByText("Image not found — returning to selection"),
			).toBeInTheDocument();
		});

		vi.advanceTimersByTime(3000);

		await waitFor(() => {
			expect(screen.getByText("Home")).toBeInTheDocument();
		});
	});

	it("shows default drawer instruction text before any marker is clicked", async () => {
		renderPage();

		const infoTab = await screen.findByRole("tab", { name: /information/i });
		await userEvent.click(infoTab);

		await waitFor(() => {
			expect(
				screen.getByText("Click a marker on the diagram to view details."),
			).toBeInTheDocument();
		});
	});

	it("fetches and displays asset details after clicking a POI marker", async () => {
		renderPage();

		const marker = await screen.findByRole("button", {
			name: "FP-PUMP-01-INLET",
		});
		await userEvent.click(marker);

		await waitFor(() => {
			expect(screen.getByText("Cooling Pump")).toBeInTheDocument();
			expect(screen.getByText("Primary Loop")).toBeInTheDocument();
			expect(screen.getByText("Inlet Valve")).toBeInTheDocument();
		});
	});

	it("shows degraded warning when asset source is unavailable", async () => {
		server.use(
			http.get("/api/fitting-positions/:id/details", () =>
				HttpResponse.json({
					...FIXTURES.positionDetail,
					asset: null,
					source_status: { asset: "degraded" },
				}),
			),
		);
		renderPage();

		const marker = await screen.findByRole("button", {
			name: "FP-PUMP-01-INLET",
		});
		await userEvent.click(marker);

		await waitFor(() => {
			expect(
				screen.getByText("Asset source unavailable — partial data shown."),
			).toBeInTheDocument();
		});
	});

	it("shows no-asset message when source is ok but record is null", async () => {
		server.use(
			http.get("/api/fitting-positions/:id/details", () =>
				HttpResponse.json({
					...FIXTURES.positionDetail,
					asset: null,
					source_status: { asset: "ok" },
				}),
			),
		);
		renderPage();

		const marker = await screen.findByRole("button", {
			name: "FP-PUMP-01-INLET",
		});
		await userEvent.click(marker);

		await waitFor(() => {
			expect(
				screen.getByText("No asset record linked to this fitting position."),
			).toBeInTheDocument();
		});
	});

	it("renders the Search tab", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: /search/i })).toBeInTheDocument();
		});
	});

	it("shows min-chars hint when query is 1 char", async () => {
		renderPage();

		const input = await screen.findByRole("textbox", {
			name: /search fitting positions/i,
		});
		await userEvent.type(input, "p");

		await waitFor(() => {
			expect(
				screen.getByText("Enter at least 2 characters to search."),
			).toBeInTheDocument();
		});
	});

	it("shows search results when query >= 2 chars", async () => {
		server.use(
			http.get("/api/search", () =>
				HttpResponse.json({
					query: "pump",
					image_id: IMAGE_ID,
					limit: 25,
					results: [
						{
							fitting_position_id: "FP-001",
							label_text: "PUMP-01",
							image_id: IMAGE_ID,
							x_coordinate: 100,
							y_coordinate: 200,
							component_name: "Cooling System",
							matched_source: "internal",
							matched_field: "label_text",
							match_type: "prefix",
						},
					],
					source_status: { internal: "ok", asset: "ok" },
					has_more: false,
					next_cursor: null,
					request_id: "req-test-1",
				}),
			),
		);
		renderPage();

		const input = await screen.findByRole("textbox", {
			name: /search fitting positions/i,
		});
		await userEvent.type(input, "pump");

		await waitFor(() => {
			expect(screen.getByText("PUMP-01")).toBeInTheDocument();
		});
	});

	it("clicking a search result switches to Information tab", async () => {
		server.use(
			http.get("/api/search", () =>
				HttpResponse.json({
					query: "pump",
					image_id: IMAGE_ID,
					limit: 25,
					results: [
						{
							fitting_position_id: "FP-001",
							label_text: "PUMP-01",
							image_id: IMAGE_ID,
							x_coordinate: 100,
							y_coordinate: 200,
							component_name: "Cooling System",
							matched_source: "internal",
							matched_field: "label_text",
							match_type: "exact",
						},
					],
					source_status: { internal: "ok", asset: "ok" },
					has_more: false,
					next_cursor: null,
					request_id: "req-test-2",
				}),
			),
		);
		renderPage();

		const input = await screen.findByRole("textbox", {
			name: /search fitting positions/i,
		});
		await userEvent.type(input, "pump");

		const resultItem = await screen.findByText("PUMP-01");
		await userEvent.click(resultItem);

		await waitFor(() => {
			expect(screen.getByRole("tab", { name: /information/i })).toHaveAttribute(
				"aria-selected",
				"true",
			);
		});
	});

	it("preserves the search entry after selecting a search result", async () => {
		server.use(
			http.get("/api/search", () =>
				HttpResponse.json({
					query: "pump",
					image_id: IMAGE_ID,
					limit: 25,
					results: [
						{
							fitting_position_id: "FP-001",
							label_text: "PUMP-01",
							image_id: IMAGE_ID,
							x_coordinate: 100,
							y_coordinate: 200,
							component_name: "Cooling System",
							matched_source: "internal",
							matched_field: "label_text",
							match_type: "exact",
						},
					],
					source_status: { internal: "ok", asset: "ok" },
					has_more: false,
					next_cursor: null,
					request_id: "req-test-persist-1",
				}),
			),
		);
		renderPage();

		const input = await screen.findByRole("textbox", {
			name: /search fitting positions/i,
		});
		await userEvent.type(input, "pump");

		const resultItem = await screen.findByText("PUMP-01");
		await userEvent.click(resultItem);

		await waitFor(() => {
			expect(screen.getByRole("tab", { name: /information/i })).toHaveAttribute(
				"aria-selected",
				"true",
			);
		});

		await userEvent.click(screen.getByRole("tab", { name: /search/i }));

		expect(
			screen.getByRole("textbox", { name: /search fitting positions/i }),
		).toHaveValue("pump");
	});

	it("pins a diagram tooltip open after selecting a result from the left panel", async () => {
		server.use(
			http.get("/api/search", () =>
				HttpResponse.json({
					query: "pump",
					image_id: IMAGE_ID,
					limit: 25,
					results: [
						{
							fitting_position_id: "FP-PUMP-01-INLET",
							label_text: "FP-PUMP-01-INLET",
							image_id: IMAGE_ID,
							x_coordinate: 300,
							y_coordinate: 250,
							component_name: "Cooling System",
							matched_source: "internal",
							matched_field: "label_text",
							match_type: "exact",
						},
					],
					source_status: { internal: "ok", asset: "ok" },
					has_more: false,
					next_cursor: null,
					request_id: "req-test-pinned-tooltip",
				}),
			),
		);
		renderPage();

		const input = await screen.findByRole("textbox", {
			name: /search fitting positions/i,
		});
		await userEvent.type(input, "pump");

		await userEvent.click(await screen.findByText("FP-PUMP-01-INLET"));

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /close tooltip/i }),
			).toBeInTheDocument();
		});

		await userEvent.click(screen.getByRole("button", { name: /close tooltip/i }));

		await waitFor(() => {
			expect(
				screen.queryByRole("button", { name: /close tooltip/i }),
			).not.toBeInTheDocument();
		});
	});

	it("restores a selected POI from the shared URL", async () => {
		renderPage(IMAGE_ID, "?fp=FP-PUMP-01-INLET");

		await waitFor(() => {
			expect(screen.getByRole("tab", { name: /information/i })).toHaveAttribute(
				"aria-selected",
				"true",
			);
		});

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /close tooltip/i }),
			).toBeInTheDocument();
		});
	});

	it("restores search parameters and zoom level from the shared URL", async () => {
		renderPage(IMAGE_ID, "?fp=FP-PUMP-01-INLET&q=pump&src=internal&z=1.5");

		await waitFor(() => {
			expect(screen.getByRole("tab", { name: /information/i })).toHaveAttribute(
				"aria-selected",
				"true",
			);
		});

		await userEvent.click(screen.getByRole("tab", { name: /search/i }));

		await waitFor(() => {
			expect(
				screen.getByRole("textbox", { name: /search fitting positions/i }),
			).toHaveValue("pump");
		});

		expect(screen.getByRole("button", { name: "internal" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByRole("button", { name: "asset" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);

		await waitFor(() => {
			expect(screen.getByText("1.5×")).toBeInTheDocument();
		});
	});

	it("updates the URL when a POI is selected", async () => {
		renderPage();

		const marker = await screen.findByRole("button", {
			name: "FP-PUMP-01-INLET",
		});
		await userEvent.click(marker);

		await waitFor(() => {
			expect(getProbeSearchParams().get("fp")).toBe("FP-PUMP-01-INLET");
		});
	});

	it("updates the URL when search parameters change", async () => {
		renderPage();

		const input = await screen.findByRole("textbox", {
			name: /search fitting positions/i,
		});
		await userEvent.type(input, "pump");
		await userEvent.click(screen.getByRole("button", { name: "asset" }));

		await waitFor(() => {
			expect(getProbeSearchParams().get("q")).toBe("pump");
			expect(getProbeSearchParams().get("src")).toBe("internal");
		});
	});

	// ── Keyboard Navigation Tests (Phase 10i) ──

	it("Tab key cycles between Search and Information tabs", async () => {
		renderPage();
		const searchTab = await screen.findByRole("tab", { name: /search/i });
		const infoTab = screen.getByRole("tab", { name: /information/i });

		searchTab.focus();
		expect(document.activeElement).toBe(searchTab);

		await userEvent.keyboard("{ArrowRight}");
		expect(document.activeElement).toBe(infoTab);

		await userEvent.keyboard("{ArrowLeft}");
		expect(document.activeElement).toBe(searchTab);
	});

	it("Enter on a POI marker triggers selection (same as click)", async () => {
		renderPage();
		const marker = await screen.findByRole("button", {
			name: "FP-PUMP-01-INLET",
		});
		marker.focus();
		await userEvent.keyboard("{Enter}");

		await waitFor(() => {
			expect(screen.getByText("Cooling Pump")).toBeInTheDocument();
		});
	});

	it("Space on a POI marker triggers selection (same as click)", async () => {
		renderPage();
		const marker = await screen.findByRole("button", {
			name: "FP-PUMP-01-INLET",
		});
		marker.focus();
		await userEvent.keyboard(" ");

		await waitFor(() => {
			expect(screen.getByText("Cooling Pump")).toBeInTheDocument();
		});
	});

	it("Enter on a search result item triggers selection", async () => {
		server.use(
			http.get("/api/search", () =>
				HttpResponse.json({
					query: "pump",
					image_id: IMAGE_ID,
					limit: 25,
					results: [
						{
							fitting_position_id: "FP-001",
							label_text: "PUMP-01",
							image_id: IMAGE_ID,
							x_coordinate: 100,
							y_coordinate: 200,
							component_name: "Cooling System",
							matched_source: "internal",
							matched_field: "label_text",
							match_type: "exact",
						},
					],
					source_status: { internal: "ok", asset: "ok" },
					has_more: false,
					next_cursor: null,
					request_id: "req-kb-1",
				}),
			),
		);
		renderPage();

		const input = await screen.findByRole("textbox", {
			name: /search fitting positions/i,
		});
		await userEvent.type(input, "pump");

		// Wait for the result to appear, then find the ListItemButton within the list
		const resultText = await screen.findByText("PUMP-01");
		// Walk up to the closest ListItemButton ancestor
		const listItemButton = resultText.closest('[role="button"]') as HTMLElement;
		listItemButton.focus();
		await userEvent.keyboard("{Enter}");

		await waitFor(() => {
			expect(screen.getByRole("tab", { name: /information/i })).toHaveAttribute(
				"aria-selected",
				"true",
			);
		});
	});

	// ── Accessibility Assertion Tests (Phase 10i) ──

	it("POI markers have aria-label attributes with fitting position IDs", async () => {
		renderPage();
		const marker = await screen.findByRole("button", {
			name: "FP-PUMP-01-INLET",
		});
		expect(marker).toHaveAttribute("aria-label", "FP-PUMP-01-INLET");
	});

	it("all IconButton zoom controls have aria-label props", async () => {
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "zoom in" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "zoom out" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "reset view" }),
			).toBeInTheDocument();
		});
	});

	it("tabs have accessible aria-label attributes", async () => {
		renderPage();
		const infoTab = await screen.findByRole("tab", { name: /information/i });
		const searchTab = screen.getByRole("tab", { name: /search/i });
		expect(infoTab).toHaveAttribute("aria-label", "information tab");
		expect(searchTab).toHaveAttribute("aria-label", "search tab");
	});

	it("Search tab is rendered first", async () => {
		renderPage();
		const tabs = await screen.findAllByRole("tab");
		expect(tabs[0]).toHaveAttribute("aria-label", "search tab");
		expect(tabs[1]).toHaveAttribute("aria-label", "information tab");
	});

	it("source status chips appear in header after search completes", async () => {
		server.use(
			http.get("/api/search", () =>
				HttpResponse.json({
					query: "pump",
					image_id: IMAGE_ID,
					limit: 25,
					results: [
						{
							fitting_position_id: "FP-001",
							label_text: "PUMP-01",
							image_id: IMAGE_ID,
							x_coordinate: 100,
							y_coordinate: 200,
							component_name: "Cooling System",
							matched_source: "internal",
							matched_field: "label_text",
							match_type: "prefix",
						},
					],
					source_status: { internal: "ok", asset: "degraded" },
					has_more: false,
					next_cursor: null,
					request_id: "req-status-1",
				}),
			),
		);
		renderPage();

		const input = await screen.findByRole("textbox", {
			name: /search fitting positions/i,
		});
		await userEvent.type(input, "pump");

		await waitFor(() => {
			expect(screen.getByText("ok")).toBeInTheDocument();
			expect(screen.getByText("degraded")).toBeInTheDocument();
		});
	});
});
