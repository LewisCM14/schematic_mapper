import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import ViewerLeftDrawer from "./ViewerLeftDrawer";

function renderDrawer() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return render(
		<ThemeProvider theme={theme}>
			<QueryClientProvider client={client}>
				<ViewerLeftDrawer
					width={320}
					imageId="00000000-0000-4000-8000-000000000001"
					selectedFpId={null}
					onSelectFp={vi.fn()}
				/>
			</QueryClientProvider>
		</ThemeProvider>,
	);
}

describe("ViewerLeftDrawer", () => {
	it("renders Information and Search tabs", () => {
		renderDrawer();
		expect(
			screen.getByRole("tab", { name: /information/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: /search/i })).toBeInTheDocument();
	});

	it("shows placeholder text on Information tab by default", () => {
		renderDrawer();
		expect(
			screen.getByText("Click a marker on the diagram to view details."),
		).toBeInTheDocument();
	});
});
