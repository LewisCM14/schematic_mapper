import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import POIMarkerCluster from "./POIMarkerCluster";

describe("POIMarkerCluster", () => {
	it("renders the cluster count", () => {
		render(
			<ThemeProvider theme={theme}>
				<POIMarkerCluster count={5} />
			</ThemeProvider>,
		);
		expect(screen.getByText("5")).toBeInTheDocument();
	});

	it("has accessible label with count", () => {
		render(
			<ThemeProvider theme={theme}>
				<POIMarkerCluster count={12} />
			</ThemeProvider>,
		);
		expect(screen.getByLabelText("12 markers clustered")).toBeInTheDocument();
	});

	it("calls onClick when clicked", async () => {
		const onClick = vi.fn();
		render(
			<ThemeProvider theme={theme}>
				<POIMarkerCluster count={3} onClick={onClick} />
			</ThemeProvider>,
		);
		await userEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledOnce();
	});
});
