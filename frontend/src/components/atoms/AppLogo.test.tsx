import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import AppLogo from "./AppLogo";

describe("AppLogo", () => {
	it("renders SM text", () => {
		render(
			<ThemeProvider theme={theme}>
				<AppLogo />
			</ThemeProvider>,
		);
		expect(screen.getByText("SM")).toBeInTheDocument();
	});

	it("has an accessible label", () => {
		render(
			<ThemeProvider theme={theme}>
				<AppLogo />
			</ThemeProvider>,
		);
		expect(screen.getByLabelText("Schematic Mapper logo")).toBeInTheDocument();
	});
});
