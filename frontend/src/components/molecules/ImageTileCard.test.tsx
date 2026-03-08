import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Image } from "../../services/api/schemas";
import theme from "../../theme";
import ImageTileCard from "./ImageTileCard";

const IMAGE_BASE = {
	image_id: "00000000-0000-4000-8000-000000000001",
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

const IMAGE_NO_THUMB = { ...IMAGE_BASE, thumbnail_url: null };
const IMAGE_WITH_THUMB = {
	...IMAGE_BASE,
	thumbnail_url: "https://example.com/thumb.svg",
};

function renderCard(image: Image = IMAGE_NO_THUMB, onClick = vi.fn()) {
	return render(
		<ThemeProvider theme={theme}>
			<ImageTileCard image={image} onClick={onClick} />
		</ThemeProvider>,
	);
}

describe("ImageTileCard", () => {
	it("renders the component name", () => {
		renderCard();
		expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument();
	});

	it("renders the drawing type badge", () => {
		renderCard();
		expect(screen.getByText("composite")).toBeInTheDocument();
	});

	it("renders the pixel dimensions", () => {
		renderCard();
		expect(screen.getByText("800 × 600 px")).toBeInTheDocument();
	});

	it("calls onClick with imageId on card click", async () => {
		const onClick = vi.fn();
		const user = userEvent.setup();
		renderCard(IMAGE_NO_THUMB, onClick);
		await user.click(screen.getByText("Cooling System Assembly"));
		expect(onClick).toHaveBeenCalledWith(IMAGE_NO_THUMB.image_id);
	});

	it("renders Skeleton when thumbnail_url is null", () => {
		renderCard(IMAGE_NO_THUMB);
		// MUI Skeleton has role="progressbar" or can be found by class
		const skeleton = document.querySelector(".MuiSkeleton-root");
		expect(skeleton).toBeInTheDocument();
	});

	it("renders CardMedia img when thumbnail_url is provided", () => {
		renderCard(IMAGE_WITH_THUMB);
		const img = screen.getByRole("img", { name: "Cooling System Assembly" });
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", IMAGE_WITH_THUMB.thumbnail_url);
	});
});
