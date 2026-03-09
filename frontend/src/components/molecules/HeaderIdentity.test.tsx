import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import HeaderIdentity from "./HeaderIdentity";

describe("HeaderIdentity", () => {
	it("renders title and logo", () => {
		render(
			<ThemeProvider theme={theme}>
				<HeaderIdentity title="Schematic Mapper" />
			</ThemeProvider>,
		);
		expect(screen.getByText("Schematic Mapper")).toBeInTheDocument();
		expect(screen.getByText("SM")).toBeInTheDocument();
	});

	it("renders context label when provided", () => {
		render(
			<ThemeProvider theme={theme}>
				<HeaderIdentity title="App" contextLabel="Cooling — composite" />
			</ThemeProvider>,
		);
		expect(screen.getByText("Cooling — composite")).toBeInTheDocument();
	});
});
