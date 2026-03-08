import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
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
});
