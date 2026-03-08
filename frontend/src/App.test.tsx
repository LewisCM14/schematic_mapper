import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App";
import theme from "./theme";

function renderWithClient(ui: React.ReactElement, initialPath = "/") {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return render(
		<ThemeProvider theme={theme}>
			<MemoryRouter initialEntries={[initialPath]}>
				<QueryClientProvider client={client}>{ui}</QueryClientProvider>
			</MemoryRouter>
		</ThemeProvider>,
	);
}

describe("App", () => {
	it("renders the image selection page at /", () => {
		renderWithClient(<App />);
		expect(screen.getByText("Schematic Mapper")).toBeInTheDocument();
	});

	it("renders the image viewer page at /viewer/:imageId", () => {
		const imageId = "00000000-0000-0000-0000-000000000001";
		renderWithClient(<App />, `/viewer/${imageId}`);
		expect(screen.getByText("Schematic Mapper")).toBeInTheDocument();
	});
});
