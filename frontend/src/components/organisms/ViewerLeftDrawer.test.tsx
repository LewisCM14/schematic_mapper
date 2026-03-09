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
	it("renders Search and Information tabs", () => {
		renderDrawer();
		const tabs = screen.getAllByRole("tab");
		expect(tabs[0]).toHaveAttribute("aria-label", "search tab");
		expect(tabs[1]).toHaveAttribute("aria-label", "information tab");
	});

	it("shows search input on Search tab by default", () => {
		renderDrawer();
		expect(
			screen.getByRole("textbox", { name: /search query/i }),
		).toBeInTheDocument();
	});
});
