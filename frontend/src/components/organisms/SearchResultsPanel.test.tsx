import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import SearchResultsPanel from "./SearchResultsPanel";

function renderPanel() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return render(
		<ThemeProvider theme={theme}>
			<QueryClientProvider client={client}>
				<SearchResultsPanel
					imageId="00000000-0000-4000-8000-000000000001"
					onSelectFp={vi.fn()}
				/>
			</QueryClientProvider>
		</ThemeProvider>,
	);
}

describe("SearchResultsPanel", () => {
	it("renders the search input", () => {
		renderPanel();
		expect(
			screen.getByRole("textbox", { name: /search query/i }),
		).toBeInTheDocument();
	});
});
