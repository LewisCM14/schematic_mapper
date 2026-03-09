import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import MetricText from "./MetricText";

describe("MetricText", () => {
	it("renders label and value", () => {
		render(
			<ThemeProvider theme={theme}>
				<MetricText label="zoom:" value="1.5×" />
			</ThemeProvider>,
		);
		expect(screen.getByText("zoom:")).toBeInTheDocument();
		expect(screen.getByText("1.5×")).toBeInTheDocument();
	});
});
