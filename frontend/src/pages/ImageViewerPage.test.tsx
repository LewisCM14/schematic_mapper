import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FIXTURES, IMAGE_ID, server } from "../test/handlers";
import theme from "../theme";
import ImageViewerPage from "./ImageViewerPage";

function renderPage(imageId = IMAGE_ID) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return render(
		<ThemeProvider theme={theme}>
			<MemoryRouter initialEntries={[`/viewer/${imageId}`]}>
				<QueryClientProvider client={client}>
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

	it("shows error when image fails to load", async () => {
		server.use(
			http.get("/api/images/:imageId", () =>
				new HttpResponse(null, { status: 404 }),
			),
		);
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByText("Failed to load schematic image."),
			).toBeInTheDocument();
		});
	});

	it("shows default drawer instruction text before any marker is clicked", async () => {
		renderPage();
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

		const searchTab = await screen.findByRole("tab", { name: /search/i });
		await userEvent.click(searchTab);

		const input = screen.getByRole("textbox", { name: /search query/i });
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

		const searchTab = await screen.findByRole("tab", { name: /search/i });
		await userEvent.click(searchTab);

		const input = screen.getByRole("textbox", { name: /search query/i });
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

		const searchTab = await screen.findByRole("tab", { name: /search/i });
		await userEvent.click(searchTab);
		const input = screen.getByRole("textbox", { name: /search query/i });
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
});
