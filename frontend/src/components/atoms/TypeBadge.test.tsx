import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import TypeBadge from "./TypeBadge";

function renderBadge(drawingType: string) {
	return render(
		<ThemeProvider theme={theme}>
			<TypeBadge drawingType={drawingType} />
		</ThemeProvider>,
	);
}

describe("TypeBadge", () => {
	it("renders the drawing type label", () => {
		renderBadge("composite");
		expect(screen.getByText("composite")).toBeInTheDocument();
	});

	it("renders as an outlined chip", () => {
		renderBadge("system");
		const chip = screen.getByText("system").closest(".MuiChip-root");
		expect(chip).toHaveClass("MuiChip-outlined");
	});

	it("renders different drawing types", () => {
		renderBadge("thermal");
		expect(screen.getByText("thermal")).toBeInTheDocument();
	});
});
