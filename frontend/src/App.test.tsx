import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import * as endpointsApi from "./services/api/endpoints";

function renderWithClient(ui: React.ReactElement, initialPath = "/") {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<QueryClientProvider client={client}>{ui}</QueryClientProvider>
		</MemoryRouter>,
	);
}

describe("App", () => {
	it("renders the image selection page at /", () => {
		vi.spyOn(endpointsApi, "fetchImages").mockResolvedValue([]);
		renderWithClient(<App />);
		expect(screen.getByText("Schematic Mapper")).toBeInTheDocument();
	});

	it("renders the image viewer page at /viewer/:imageId", () => {
		const imageId = "00000000-0000-0000-0000-000000000001";
		vi.spyOn(endpointsApi, "fetchImage").mockResolvedValue({
			image_id: imageId,
			component_name: "Cooling System",
			drawing_type: {
				drawing_type_id: 1,
				type_name: "composite",
				description: "",
				is_active: true,
			},
			width_px: 800,
			height_px: 600,
			uploaded_at: "2024-01-01T00:00:00Z",
			image_svg: "<svg/>",
		});
		vi.spyOn(endpointsApi, "fetchFittingPositions").mockResolvedValue([]);
		renderWithClient(<App />, `/viewer/${imageId}`);
		expect(screen.getByText("Image Viewer")).toBeInTheDocument();
	});
});
