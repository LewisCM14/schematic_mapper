import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as endpointsApi from "../services/api/endpoints";
import ImageViewerPage from "./ImageViewerPage";

const IMAGE_ID = "00000000-0000-0000-0000-000000000001";

const mockImageDetail = {
	image_id: IMAGE_ID,
	component_name: "Cooling System Assembly",
	drawing_type: {
		drawing_type_id: 1,
		type_name: "composite",
		description: "",
		is_active: true,
	},
	width_px: 800,
	height_px: 600,
	uploaded_at: "2024-01-01T00:00:00Z",
	image_svg:
		'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/>',
};

const mockPositions = [
	{
		fitting_position_id: "FP-PUMP-01-INLET",
		x_coordinate: 300,
		y_coordinate: 250,
		label_text: "FP-PUMP-01-INLET",
		is_active: true,
	},
];

const mockDetail = {
	fitting_position_id: "FP-PUMP-01-INLET",
	label_text: "FP-PUMP-01-INLET",
	x_coordinate: 300,
	y_coordinate: 250,
	asset: {
		asset_record_id: "AR-001",
		high_level_component: "Cooling Pump",
		sub_system_name: "Primary Loop",
		sub_component_name: "Inlet Valve",
	},
	source_status: { asset: "ok" },
};

function renderPage(imageId = IMAGE_ID) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<MemoryRouter initialEntries={[`/viewer/${imageId}`]}>
			<QueryClientProvider client={client}>
				<Routes>
					<Route path="/viewer/:imageId" element={<ImageViewerPage />} />
					<Route path="/" element={<div>Home</div>} />
				</Routes>
			</QueryClientProvider>
		</MemoryRouter>,
	);
}

describe("ImageViewerPage", () => {
	it("redirects to / when imageId is missing", () => {
		const client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		render(
			<MemoryRouter initialEntries={["/viewer/"]}>
				<QueryClientProvider client={client}>
					<Routes>
						<Route path="/viewer/" element={<ImageViewerPage />} />
						<Route path="/" element={<div>Home</div>} />
					</Routes>
				</QueryClientProvider>
			</MemoryRouter>,
		);
		expect(screen.getByText("Home")).toBeInTheDocument();
	});

	it("shows image heading when data loads", async () => {
		vi.spyOn(endpointsApi, "fetchImage").mockResolvedValue(mockImageDetail);
		vi.spyOn(endpointsApi, "fetchFittingPositions").mockResolvedValue([]);
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument();
		});
	});

	it("renders POI marker pins", async () => {
		vi.spyOn(endpointsApi, "fetchImage").mockResolvedValue(mockImageDetail);
		vi.spyOn(endpointsApi, "fetchFittingPositions").mockResolvedValue(
			mockPositions,
		);
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "FP-PUMP-01-INLET" }),
			).toBeInTheDocument();
		});
	});

	it("shows error when image fails to load", async () => {
		vi.spyOn(endpointsApi, "fetchImage").mockRejectedValue(
			new Error("Not Found"),
		);
		vi.spyOn(endpointsApi, "fetchFittingPositions").mockResolvedValue([]);
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByText("Failed to load schematic image."),
			).toBeInTheDocument();
		});
	});

	it("shows default drawer instruction text before any marker is clicked", async () => {
		vi.spyOn(endpointsApi, "fetchImage").mockResolvedValue(mockImageDetail);
		vi.spyOn(endpointsApi, "fetchFittingPositions").mockResolvedValue([]);
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByText("Click a marker on the diagram to view details."),
			).toBeInTheDocument();
		});
	});

	it("fetches and displays asset details after clicking a POI marker", async () => {
		vi.spyOn(endpointsApi, "fetchImage").mockResolvedValue(mockImageDetail);
		vi.spyOn(endpointsApi, "fetchFittingPositions").mockResolvedValue(
			mockPositions,
		);
		vi.spyOn(endpointsApi, "fetchFittingPositionDetails").mockResolvedValue(
			mockDetail,
		);
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
		vi.spyOn(endpointsApi, "fetchImage").mockResolvedValue(mockImageDetail);
		vi.spyOn(endpointsApi, "fetchFittingPositions").mockResolvedValue(
			mockPositions,
		);
		vi.spyOn(endpointsApi, "fetchFittingPositionDetails").mockResolvedValue({
			...mockDetail,
			asset: null,
			source_status: { asset: "degraded" },
		});
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
		vi.spyOn(endpointsApi, "fetchImage").mockResolvedValue(mockImageDetail);
		vi.spyOn(endpointsApi, "fetchFittingPositions").mockResolvedValue(
			mockPositions,
		);
		vi.spyOn(endpointsApi, "fetchFittingPositionDetails").mockResolvedValue({
			...mockDetail,
			asset: null,
			source_status: { asset: "ok" },
		});
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
		vi.spyOn(endpointsApi, "fetchImage").mockResolvedValue(mockImageDetail);
		vi.spyOn(endpointsApi, "fetchFittingPositions").mockResolvedValue([]);
		renderPage();
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: /search/i })).toBeInTheDocument();
		});
	});

	it("shows min-chars hint when query is 1 char", async () => {
		vi.spyOn(endpointsApi, "fetchImage").mockResolvedValue(mockImageDetail);
		vi.spyOn(endpointsApi, "fetchFittingPositions").mockResolvedValue([]);
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
		vi.spyOn(endpointsApi, "fetchImage").mockResolvedValue(mockImageDetail);
		vi.spyOn(endpointsApi, "fetchFittingPositions").mockResolvedValue([]);
		vi.spyOn(endpointsApi, "fetchSearch").mockResolvedValue({
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
		});
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
		vi.spyOn(endpointsApi, "fetchImage").mockResolvedValue(mockImageDetail);
		vi.spyOn(endpointsApi, "fetchFittingPositions").mockResolvedValue([]);
		vi.spyOn(endpointsApi, "fetchSearch").mockResolvedValue({
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
		});
		vi.spyOn(endpointsApi, "fetchFittingPositionDetails").mockResolvedValue(
			mockDetail,
		);
		renderPage();

		const searchTab = await screen.findByRole("tab", { name: /search/i });
		await userEvent.click(searchTab);
		const input = screen.getByRole("textbox", { name: /search query/i });
		await userEvent.type(input, "pump");

		const resultItem = await screen.findByText("PUMP-01");
		await userEvent.click(resultItem);

		// Should now show the Information tab content
		await waitFor(() => {
			expect(screen.getByRole("tab", { name: /information/i })).toHaveAttribute(
				"aria-selected",
				"true",
			);
		});
	});
});
