import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import DetailFieldRow from "./DetailFieldRow";

describe("DetailFieldRow", () => {
	it("renders label and value", () => {
		render(
			<ThemeProvider theme={theme}>
				<DetailFieldRow label="Sub-System" value="Primary Loop" />
			</ThemeProvider>,
		);
		expect(screen.getByText("Sub-System")).toBeInTheDocument();
		expect(screen.getByText("Primary Loop")).toBeInTheDocument();
	});

	it("renders dash for null value", () => {
		render(
			<ThemeProvider theme={theme}>
				<DetailFieldRow label="Component" value={null} />
			</ThemeProvider>,
		);
		expect(screen.getByText("—")).toBeInTheDocument();
	});
});
