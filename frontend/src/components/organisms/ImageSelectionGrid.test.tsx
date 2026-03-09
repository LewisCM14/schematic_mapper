import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Image } from "../../services/api/schemas";
import theme from "../../theme";
import ImageSelectionGrid from "./ImageSelectionGrid";

const MOCK_IMAGE: Image = {
	image_id: "00000000-0000-4000-8000-000000000001",
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
	thumbnail_url: null,
};

describe("ImageSelectionGrid", () => {
	it("renders image tile cards", () => {
		render(
			<ThemeProvider theme={theme}>
				<ImageSelectionGrid images={[MOCK_IMAGE]} onImageClick={vi.fn()} />
			</ThemeProvider>,
		);
		expect(screen.getByText("Cooling System")).toBeInTheDocument();
	});

	it("renders load more button when hasNextPage", () => {
		render(
			<ThemeProvider theme={theme}>
				<ImageSelectionGrid
					images={[MOCK_IMAGE]}
					onImageClick={vi.fn()}
					hasNextPage
					onLoadMore={vi.fn()}
				/>
			</ThemeProvider>,
		);
		expect(
			screen.getByRole("button", { name: /load more/i }),
		).toBeInTheDocument();
	});

	it("renders skeleton placeholders when loading with no images", () => {
		const { container } = render(
			<ThemeProvider theme={theme}>
				<ImageSelectionGrid images={[]} onImageClick={vi.fn()} isLoading />
			</ThemeProvider>,
		);
		const skeletons = container.querySelectorAll(".MuiSkeleton-root");
		expect(skeletons.length).toBe(3);
	});

	it("renders an error alert when isError is true", () => {
		render(
			<ThemeProvider theme={theme}>
				<ImageSelectionGrid images={[]} onImageClick={vi.fn()} isError />
			</ThemeProvider>,
		);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Failed to load images",
		);
	});

	it("renders custom error message", () => {
		render(
			<ThemeProvider theme={theme}>
				<ImageSelectionGrid
					images={[]}
					onImageClick={vi.fn()}
					isError
					errorMessage="Server down"
				/>
			</ThemeProvider>,
		);
		expect(screen.getByRole("alert")).toHaveTextContent("Server down");
	});

	it("renders empty state when images array is empty", () => {
		render(
			<ThemeProvider theme={theme}>
				<ImageSelectionGrid images={[]} onImageClick={vi.fn()} />
			</ThemeProvider>,
		);
		expect(screen.getByText(/no images found/i)).toBeInTheDocument();
	});
});
