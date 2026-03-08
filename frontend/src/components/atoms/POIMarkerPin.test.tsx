import { ThemeProvider } from "@mui/material/styles";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import POIMarkerPin from "./POIMarkerPin";

function renderPin(selected: boolean) {
	return render(
		<ThemeProvider theme={theme}>
			<POIMarkerPin selected={selected} />
		</ThemeProvider>,
	);
}

describe("POIMarkerPin", () => {
	it("renders an svg element", () => {
		renderPin(false);
		expect(document.querySelector("svg")).toBeInTheDocument();
	});

	it("uses default (unselected) fill color from theme", () => {
		renderPin(false);
		const circle = document.querySelector("circle");
		expect(circle).toBeInTheDocument();
		expect(circle?.getAttribute("fill")).toBe(theme.palette.map.poi.default);
	});

	it("uses selected fill color from theme when selected", () => {
		renderPin(true);
		const circle = document.querySelector("circle");
		expect(circle?.getAttribute("fill")).toBe(theme.palette.map.poi.selected);
	});

	it("renders a circle element inside the svg", () => {
		renderPin(false);
		const svg = document.querySelector("svg");
		expect(svg?.querySelector("circle")).toBeInTheDocument();
	});
});
