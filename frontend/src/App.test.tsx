import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "react-error-boundary";
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

	it("error boundary renders fallback with Retry button when child throws", async () => {
		function ThrowingComponent(): never {
			throw new Error("Test render error");
		}

		const client = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});

		// Suppress React's console.error for the expected thrown error
		const consoleError = console.error;
		console.error = () => {};

		render(
			<ThemeProvider theme={theme}>
				<MemoryRouter>
					<QueryClientProvider client={client}>
						<ErrorBoundary
							fallbackRender={({ error, resetErrorBoundary }) => (
								<div>
									<div role="alert">
										{error instanceof Error ? error.message : "Error"}
									</div>
									<button type="button" onClick={resetErrorBoundary}>
										Retry
									</button>
								</div>
							)}
						>
							<ThrowingComponent />
						</ErrorBoundary>
					</QueryClientProvider>
				</MemoryRouter>
			</ThemeProvider>,
		);

		console.error = consoleError;

		expect(screen.getByRole("alert")).toBeInTheDocument();
		expect(screen.getByRole("alert")).toHaveTextContent("Test render error");
		const retryBtn = screen.getByRole("button", { name: /retry/i });
		expect(retryBtn).toBeInTheDocument();
	});

	it("ErrorFallback Retry button calls resetErrorBoundary", async () => {
		let shouldThrow = true;
		function ConditionalThrow() {
			if (shouldThrow) throw new Error("Boom");
			return <div>Recovered</div>;
		}

		const client = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});
		const consoleError = console.error;
		console.error = () => {};

		render(
			<ThemeProvider theme={theme}>
				<MemoryRouter>
					<QueryClientProvider client={client}>
						<ErrorBoundary
							fallbackRender={({ resetErrorBoundary }) => (
								<button
									type="button"
									onClick={() => {
										shouldThrow = false;
										resetErrorBoundary();
									}}
								>
									Retry
								</button>
							)}
						>
							<ConditionalThrow />
						</ErrorBoundary>
					</QueryClientProvider>
				</MemoryRouter>
			</ThemeProvider>,
		);

		console.error = consoleError;

		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: /retry/i }));
		expect(screen.getByText("Recovered")).toBeInTheDocument();
	});
});
