import { http, HttpResponse } from "msw";
import { server } from "./test/handlers";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import theme from "./theme";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

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

describe("Dev mode authentication (AUTH_MODE=dev)", () => {
	beforeAll(() => {
		// Override /api/user to simulate dev mode user
		server.use(
			http.get("/api/user", () =>
				HttpResponse.json({
					user_id: "dev-user",
					username: "devuser",
					email: "devuser@example.com",
					roles: ["admin"],
					is_active: true,
					dev_mode: true,
				}),
			),
		);
	});

	afterAll(() => {
		// Reset handlers after test
		server.resetHandlers();
	});

	it("renders admin features for dev user", async () => {
		renderWithClient(<App />, "/admin");
		// Should see admin UI (look for heading or feature only visible to admin)
		expect(
			await screen.findByText(
				(content) => content.includes("Admin"),
				{},
				{ timeout: 5000 },
			),
		).toBeInTheDocument();
	});
});
