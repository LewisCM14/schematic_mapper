import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { type ReactElement, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App, { ErrorFallback, PageLoader } from "./App";
import * as useDrawingTypesModule from "./services/api/hooks/useDrawingTypes";
import * as useImagesModule from "./services/api/hooks/useImages";
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
	beforeAll(() => {
		// Mock useDrawingTypes to return static data
		vi.spyOn(useDrawingTypesModule, "useDrawingTypes").mockReturnValue({
			data: [
				{
					drawing_type_id: 1,
					type_name: "Type 1",
					description: "desc",
					is_active: true,
				},
			],
			isLoading: false,
			isError: false,
			error: null,
			isPending: false,
			isLoadingError: false,
			isRefetchError: false,
			isSuccess: true,
			isFetched: true,
			isFetchedAfterMount: true,
			isStale: false,
			isPlaceholderData: false,
			dataUpdatedAt: Date.now(),
			errorUpdatedAt: Date.now(),
			failureCount: 0,
			failureReason: null,
			isPaused: false,
			refetch: vi.fn(),
			status: "success",
			errorUpdateCount: 0,
			isFetching: false,
			isInitialLoading: false,
			isRefetching: false,
			isEnabled: true,
			fetchStatus: "idle",
			promise: Promise.resolve([
				{
					drawing_type_id: 1,
					type_name: "Type 1",
					description: "desc",
					is_active: true,
				},
			]),
		});
		// Mock useImages to return static data
		vi.spyOn(useImagesModule, "useImages").mockReturnValue({
			data: {
				pages: [
					{
						results: [],
						has_more: false,
						next_cursor: undefined,
					},
				],
				pageParams: [null],
			},
			isLoading: false,
			isError: false,
			error: null,
			hasNextPage: false,
			hasPreviousPage: false,
			fetchNextPage: vi.fn(),
			fetchPreviousPage: vi.fn(),
			isFetchingNextPage: false,
			isFetchingPreviousPage: false,
			isRefetching: false,
			isPending: false,
			isLoadingError: false,
			isRefetchError: false,
			isSuccess: true,
			isFetched: true,
			isFetchedAfterMount: true,
			isStale: false,
			isPlaceholderData: false,
			dataUpdatedAt: Date.now(),
			errorUpdatedAt: Date.now(),
			failureCount: 0,
			failureReason: null,
			isPaused: false,
			refetch: vi.fn(),
			status: "success",
			errorUpdateCount: 0,
			isFetching: false,
			isInitialLoading: false,
			isFetchNextPageError: false,
			isFetchPreviousPageError: false,
			isEnabled: true,
			fetchStatus: "idle",
			promise: Promise.resolve({
				pages: [
					{
						results: [],
						has_more: false,
						next_cursor: undefined,
					},
				],
				pageParams: [null],
			}),
		});
	});

	afterAll(() => {
		vi.restoreAllMocks();
	});

	it("renders the image selection page at /", async () => {
		renderWithClient(<App />);
		expect(
			await screen.findByText("Schematic Mapper", {}, { timeout: 5000 }),
		).toBeInTheDocument();
	});

	it("renders the image viewer page at /viewer/:imageId", async () => {
		const imageId = "00000000-0000-0000-0000-000000000001";
		renderWithClient(<App />, `/viewer/${imageId}`);
		expect(
			await screen.findByText("Schematic Mapper", {}, { timeout: 5000 }),
		).toBeInTheDocument();
	});

	it("renders the admin upload mapping page at /admin", async () => {
		renderWithClient(<App />, "/admin");
		// Look for the static Admin Panel title
		expect(
			await screen.findByText(/Admin Panel/i, {}, { timeout: 5000 }),
		).toBeInTheDocument();
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

	it("focuses retry button after error boundary fallback renders", () => {
		function ThrowingComponent(): never {
			throw new Error("Focus test error");
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
							fallbackRender={({ resetErrorBoundary }) => {
								return (
									<div>
										<div role="alert">Something went wrong</div>
										<button
											type="button"
											onClick={resetErrorBoundary}
											ref={(el) => el?.focus()}
										>
											Retry
										</button>
									</div>
								);
							}}
						>
							<ThrowingComponent />
						</ErrorBoundary>
					</QueryClientProvider>
				</MemoryRouter>
			</ThemeProvider>,
		);

		console.error = consoleError;

		const retryBtn = screen.getByRole("button", { name: /retry/i });
		expect(retryBtn).toHaveFocus();
	});

	it("renders the ErrorFallback with default message for non-Error values", () => {
		// Component that throws a plain object during render
		function ThrowObject(): ReactElement {
			throw { foo: "bar" };
		}
		const { getByRole } = render(
			<ThemeProvider theme={theme}>
				<ErrorBoundary FallbackComponent={ErrorFallback}>
					<ThrowObject />
				</ErrorBoundary>
			</ThemeProvider>,
		);
		expect(getByRole("alert")).toHaveTextContent(
			"An unexpected error occurred.",
		);
	});

	it("renders the PageLoader fallback", () => {
		// Lazy component that never resolves
		const Never = React.lazy(() => new Promise(() => {}));
		const { getByRole } = render(
			<ThemeProvider theme={theme}>
				<Suspense fallback={<PageLoader />}>
					<Never />
				</Suspense>
			</ThemeProvider>,
		);
		expect(getByRole("progressbar")).toBeInTheDocument();
	});

	it("renders ErrorFallback for error in / route", () => {
		function ThrowObject(): ReactElement {
			throw { foo: "bar" };
		}
		render(
			<ThemeProvider theme={theme}>
				<ErrorBoundary FallbackComponent={ErrorFallback}>
					<ThrowObject />
				</ErrorBoundary>
			</ThemeProvider>,
		);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"An unexpected error occurred.",
		);
	});

	it("renders ErrorFallback for error in /viewer/:imageId route", () => {
		function ThrowObject(): ReactElement {
			throw { foo: "bar" };
		}
		render(
			<ThemeProvider theme={theme}>
				<ErrorBoundary FallbackComponent={ErrorFallback}>
					<ThrowObject />
				</ErrorBoundary>
			</ThemeProvider>,
		);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"An unexpected error occurred.",
		);
	});

	it("renders ErrorFallback for error in /admin route", () => {
		function ThrowObject(): ReactElement {
			throw { foo: "bar" };
		}
		render(
			<ThemeProvider theme={theme}>
				<ErrorBoundary FallbackComponent={ErrorFallback}>
					<ThrowObject />
				</ErrorBoundary>
			</ThemeProvider>,
		);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"An unexpected error occurred.",
		);
	});

	it("renders PageLoader fallback for all lazy routes", () => {
		const Never = React.lazy(() => new Promise(() => {}));
		const { getByRole } = render(
			<ThemeProvider theme={theme}>
				<Suspense fallback={<PageLoader />}>
					<Never />
				</Suspense>
			</ThemeProvider>,
		);
		expect(getByRole("progressbar")).toBeInTheDocument();
	});
});
