import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import POIDetailPanel from "./POIDetailPanel";

function renderPanel(fittingPositionId: string | null) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return render(
		<ThemeProvider theme={theme}>
			<QueryClientProvider client={client}>
				<POIDetailPanel fittingPositionId={fittingPositionId} />
			</QueryClientProvider>
		</ThemeProvider>,
	);
}

describe("POIDetailPanel", () => {
	it("shows placeholder when no fitting position is selected", () => {
		renderPanel(null);
		expect(
			screen.getByText("Click a marker on the diagram to view details."),
		).toBeInTheDocument();
	});

	it("shows fitting position details when data loads", async () => {
		renderPanel("FP-PUMP-01-INLET");
		await waitFor(() => {
			expect(screen.getByText("FP-PUMP-01-INLET")).toBeInTheDocument();
			expect(screen.getByText("Cooling Pump")).toBeInTheDocument();
		});
	});
});
