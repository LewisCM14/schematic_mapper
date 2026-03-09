import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import ValidationSummaryRow from "./ValidationSummaryRow";

describe("ValidationSummaryRow", () => {
	it("renders total count", () => {
		render(
			<ThemeProvider theme={theme}>
				<ValidationSummaryRow totalCount={10} />
			</ThemeProvider>,
		);
		expect(screen.getByText("10 positions")).toBeInTheDocument();
	});

	it("renders warning and error chips when non-zero", () => {
		render(
			<ThemeProvider theme={theme}>
				<ValidationSummaryRow totalCount={10} warningCount={2} errorCount={1} />
			</ThemeProvider>,
		);
		expect(screen.getByText("2 warnings")).toBeInTheDocument();
		expect(screen.getByText("1 errors")).toBeInTheDocument();
	});
});
