import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import POIDetailPanel from "./POIDetailPanel";

// Mock the data hook for custom states
vi.mock("../../services/api/hooks/useFittingPositionDetails", () => ({
	useFittingPositionDetails: vi.fn(),
}));

import type { Mock } from "vitest";
import { useFittingPositionDetails } from "../../services/api/hooks/useFittingPositionDetails";

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
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("shows loading spinner when loading", () => {
		(useFittingPositionDetails as Mock).mockReturnValue({
			isLoading: true,
			isError: false,
			data: undefined,
		});
		renderPanel("FP-LOADING");
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("shows error alert when error", () => {
		(useFittingPositionDetails as Mock).mockReturnValue({
			isLoading: false,
			isError: true,
			data: undefined,
		});
		renderPanel("FP-ERROR");
		expect(
			screen.getByText(/failed to load fitting position details/i),
		).toBeInTheDocument();
	});

	it("shows degraded warning and asset data missing message", () => {
		(useFittingPositionDetails as Mock).mockReturnValue({
			isLoading: false,
			isError: false,
			data: {
				label_text: "FP-002",
				x_coordinate: 1,
				y_coordinate: 2,
				width: 0,
				height: 0,
				asset: null,
				source_status: { asset: "degraded" },
			},
		});
		renderPanel("FP-002");
		expect(screen.getByText(/asset source unavailable/i)).toBeInTheDocument();
		expect(
			screen.getByText(/asset data could not be retrieved/i),
		).toBeInTheDocument();
	});

	it("shows no asset record message when not degraded", () => {
		(useFittingPositionDetails as Mock).mockReturnValue({
			isLoading: false,
			isError: false,
			data: {
				label_text: "FP-003",
				x_coordinate: 1,
				y_coordinate: 2,
				width: 0,
				height: 0,
				asset: null,
				source_status: { asset: "ok" },
			},
		});
		renderPanel("FP-003");
		expect(screen.getByText(/no asset record linked/i)).toBeInTheDocument();
	});
	it("shows placeholder when no fitting position is selected", () => {
		renderPanel(null);
		expect(
			screen.getByText("Click a marker on the diagram to view details."),
		).toBeInTheDocument();
	});

	it("shows fitting position details when data loads", async () => {
		(useFittingPositionDetails as Mock).mockReturnValue({
			isLoading: false,
			isError: false,
			data: {
				label_text: "FP-PUMP-01-INLET",
				x_coordinate: 10,
				y_coordinate: 20,
				width: 30,
				height: 40,
				asset: {
					asset_record_id: "ARID-123",
					high_level_component: "Cooling Pump",
					sub_system_name: "SYS-1",
					sub_component_name: "COMP-1",
				},
				source_status: { asset: "ok" },
			},
		});
		renderPanel("FP-PUMP-01-INLET");
		expect(screen.getByText("FP-PUMP-01-INLET")).toBeInTheDocument();
		expect(screen.getByText("Cooling Pump")).toBeInTheDocument();
		expect(screen.getByText("Record ID")).toBeInTheDocument();
		expect(screen.getByText("ARID-123")).toBeInTheDocument();
		expect(screen.getByText("High-Level Component")).toBeInTheDocument();
		expect(screen.getByText("SYS-1")).toBeInTheDocument();
		expect(screen.getByText("COMP-1")).toBeInTheDocument();
	});
});
