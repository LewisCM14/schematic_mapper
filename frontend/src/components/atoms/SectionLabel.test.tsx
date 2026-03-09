import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import SectionLabel from "./SectionLabel";

describe("SectionLabel", () => {
	it("renders text content", () => {
		render(
			<ThemeProvider theme={theme}>
				<SectionLabel>Asset Information</SectionLabel>
			</ThemeProvider>,
		);
		expect(screen.getByText("Asset Information")).toBeInTheDocument();
	});
});
