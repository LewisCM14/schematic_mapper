import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import ImageViewerTemplate from "./ImageViewerTemplate";

function renderWithProviders(ui: React.ReactElement) {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={qc}>
			<ThemeProvider theme={theme}>
				<MemoryRouter>{ui}</MemoryRouter>
			</ThemeProvider>
		</QueryClientProvider>,
	);
}

describe("ImageViewerTemplate", () => {
	it("renders header, heading, and footer", () => {
		renderWithProviders(
			<ImageViewerTemplate
				title="Schematic Mapper"
				contextLabel="Pump — P&ID"
				drawerWidth={320}
				imageId="img-1"
				selectedFpId={null}
				onSelectFp={vi.fn()}
				activeTab={0}
				onTabChange={vi.fn()}
				heading="Test Heading"
				subheading="Test Sub"
				isLoading={false}
				isError={false}
				markers={[]}
				onMarkerClick={vi.fn()}
				onZoomChange={vi.fn()}
				panToTarget={null}
				selectedMarkerId={null}
				sourceStatus={{}}
				requestId={null}
				lastRefreshed={null}
				zoomLevel={1}
			/>,
		);
		expect(screen.getByText("Schematic Mapper")).toBeInTheDocument();
		expect(screen.getByText("Test Heading")).toBeInTheDocument();
		expect(screen.getByText("Test Sub")).toBeInTheDocument();
	});
});
