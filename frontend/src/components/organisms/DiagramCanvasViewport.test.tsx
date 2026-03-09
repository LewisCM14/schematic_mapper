import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import DiagramCanvasViewport, {
	type CanvasMarker,
} from "./DiagramCanvasViewport";

const SVG_URL =
	"data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22800%22%20height%3D%22600%22%2F%3E";

const MARKERS: CanvasMarker[] = [
	{ id: "FP-001", x: 100, y: 200, status: "mapped" },
	{ id: "FP-002", x: 300, y: 400, status: "unmapped" },
];

// Markers close enough to cluster at default scale
const CLOSE_MARKERS: CanvasMarker[] = [
	{ id: "FP-A", x: 100, y: 100, status: "mapped" },
	{ id: "FP-B", x: 105, y: 105, status: "mapped" },
	{ id: "FP-C", x: 110, y: 110, status: "mapped" },
];

function renderCanvas(
	props: Partial<React.ComponentProps<typeof DiagramCanvasViewport>> = {},
) {
	return render(
		<ThemeProvider theme={theme}>
			<DiagramCanvasViewport
				imageSvgUrl={SVG_URL}
				markers={MARKERS}
				{...props}
			/>
		</ThemeProvider>,
	);
}

describe("DiagramCanvasViewport", () => {
	it("renders the schematic image", () => {
		renderCanvas();
		const img = screen.getByAltText("schematic diagram");
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", SVG_URL);
	});

	it("renders markers at specified positions", () => {
		renderCanvas();
		expect(screen.getByRole("button", { name: "FP-001" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "FP-002" })).toBeInTheDocument();
	});

	it("fires onMarkerClick when a marker is clicked", async () => {
		const onMarkerClick = vi.fn();
		renderCanvas({ onMarkerClick });

		await userEvent.click(screen.getByRole("button", { name: "FP-001" }));
		expect(onMarkerClick).toHaveBeenCalledWith("FP-001");
	});

	it("renders zoom control buttons", () => {
		renderCanvas();
		expect(screen.getByRole("button", { name: "zoom in" })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "zoom out" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "reset view" }),
		).toBeInTheDocument();
	});

	it("renders the canvas container with data-testid", () => {
		renderCanvas();
		expect(screen.getByTestId("diagram-canvas")).toBeInTheDocument();
	});

	it("renders a POIMarkerCluster when markers are close together", () => {
		renderCanvas({ markers: CLOSE_MARKERS });
		expect(
			screen.getByRole("button", { name: /markers clustered/ }),
		).toBeInTheDocument();
		// Individual pin buttons should NOT appear when clustered
		expect(screen.queryByRole("button", { name: "FP-A" })).toBeNull();
	});

	it("renders individual POIMarkerPins when markers are spread apart", () => {
		renderCanvas({ markers: MARKERS });
		expect(screen.getByRole("button", { name: "FP-001" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "FP-002" })).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /markers clustered/ }),
		).toBeNull();
	});
});
