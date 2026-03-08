import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as endpointsApi from "../services/api/endpoints";
import ImageSelectionPage from "./ImageSelectionPage";

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<MemoryRouter>
			<QueryClientProvider client={client}>
				<ImageSelectionPage />
			</QueryClientProvider>
		</MemoryRouter>,
	);
}

const mockImage = {
	image_id: "00000000-0000-0000-0000-000000000001",
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
};

describe("ImageSelectionPage", () => {
	it("shows heading", () => {
		vi.spyOn(endpointsApi, "fetchImages").mockResolvedValue([]);
		renderPage();
		expect(screen.getByText("Schematic Mapper")).toBeInTheDocument();
	});

	it("shows image cards when data loads", async () => {
		vi.spyOn(endpointsApi, "fetchImages").mockResolvedValue([mockImage]);
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument();
		});
		expect(screen.getByText("composite")).toBeInTheDocument();
		expect(screen.getByText("800 × 600 px")).toBeInTheDocument();
	});

	it("shows empty state when no images exist", async () => {
		vi.spyOn(endpointsApi, "fetchImages").mockResolvedValue([]);
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByText(/No schematic drawings found/),
			).toBeInTheDocument();
		});
	});

	it("shows error when fetch fails", async () => {
		vi.spyOn(endpointsApi, "fetchImages").mockRejectedValue(
			new Error("Network Error"),
		);
		renderPage();
		await waitFor(() => {
			expect(screen.getByText(/Failed to load images/)).toBeInTheDocument();
		});
	});

	it("navigates to viewer on card click", async () => {
		vi.spyOn(endpointsApi, "fetchImages").mockResolvedValue([mockImage]);
		const user = userEvent.setup();
		renderPage();
		await waitFor(() =>
			expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument(),
		);
		await user.click(screen.getByText("Cooling System Assembly"));
	});
});
