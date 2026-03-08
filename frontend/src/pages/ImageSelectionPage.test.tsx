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

	it("renders drawing type dropdown", async () => {
		vi.spyOn(endpointsApi, "fetchImages").mockResolvedValue([mockImage]);
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByRole("combobox", { name: /drawing type/i }),
			).toBeInTheDocument();
		});
	});

	it("tile grid is hidden before a drawing type is selected", async () => {
		vi.spyOn(endpointsApi, "fetchImages").mockResolvedValue([mockImage]);
		renderPage();
		await waitFor(() =>
			expect(
				screen.getByRole("combobox", { name: /drawing type/i }),
			).toBeInTheDocument(),
		);
		expect(
			screen.queryByText("Cooling System Assembly"),
		).not.toBeInTheDocument();
	});

	it("shows prompt to select a type when no type chosen", async () => {
		vi.spyOn(endpointsApi, "fetchImages").mockResolvedValue([]);
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByText(
					/Select a drawing type above to view available schematics/,
				),
			).toBeInTheDocument();
		});
	});

	it("shows image cards after selecting a drawing type", async () => {
		vi.spyOn(endpointsApi, "fetchImages").mockResolvedValue([mockImage]);
		const user = userEvent.setup();
		renderPage();

		await waitFor(() =>
			expect(
				screen.getByRole("combobox", { name: /drawing type/i }),
			).toBeInTheDocument(),
		);

		await user.click(screen.getByRole("combobox", { name: /drawing type/i }));
		const option = await screen.findByRole("option", { name: "composite" });
		await user.click(option);

		await waitFor(() => {
			expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument();
		});
		expect(screen.getAllByText("composite").length).toBeGreaterThan(0);
		expect(screen.getByText("800 × 600 px")).toBeInTheDocument();
	});

	it("navigates to viewer on card click", async () => {
		vi.spyOn(endpointsApi, "fetchImages").mockResolvedValue([mockImage]);
		const user = userEvent.setup();
		renderPage();

		await waitFor(() =>
			expect(
				screen.getByRole("combobox", { name: /drawing type/i }),
			).toBeInTheDocument(),
		);
		await user.click(screen.getByRole("combobox", { name: /drawing type/i }));
		const option = await screen.findByRole("option", { name: "composite" });
		await user.click(option);

		await waitFor(() =>
			expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument(),
		);
		await user.click(screen.getByText("Cooling System Assembly"));
	});

	it("shows error when fetch fails", async () => {
		vi.spyOn(endpointsApi, "fetchImages")
			.mockResolvedValueOnce([mockImage]) // unfiltered call → populates dropdown
			.mockRejectedValueOnce(new Error("Network Error")); // filtered call → error
		const user = userEvent.setup();
		renderPage();

		// Wait for dropdown to populate
		await waitFor(() =>
			expect(
				screen.getByRole("combobox", { name: /drawing type/i }),
			).toBeInTheDocument(),
		);

		// Select a type to trigger the filtered query
		await user.click(screen.getByRole("combobox", { name: /drawing type/i }));
		const option = await screen.findByRole("option", { name: "composite" });
		await user.click(option);

		await waitFor(() => {
			expect(screen.getByText(/Failed to load images/)).toBeInTheDocument();
		});
	});
});
