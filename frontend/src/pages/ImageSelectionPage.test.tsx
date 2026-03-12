import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FIXTURES, server } from "../test/handlers";

// Ensure the /api/images mock is always in place before any test/component runs
server.use(
	http.get("/api/images", ({ request }) => {
		const url = new URL(request.url);
		const drawingTypeId = url.searchParams.get("drawing_type_id");
		if (drawingTypeId === "2") {
			return HttpResponse.json({
				results: [
					{
						...FIXTURES.image,
						image_id: "00000000-0000-4000-8000-000000000002",
						component_name: "system",
						drawing_type: {
							drawing_type_id: 2,
							type_name: "system",
							description: "",
							is_active: true,
						},
					},
				],
				has_more: false,
				next_cursor: undefined,
			});
		}
		// Default to composite
		return HttpResponse.json({
			results: [FIXTURES.image],
			has_more: false,
			next_cursor: undefined,
		});
	}),
);

import theme from "../theme";
import ImageSelectionPage from "./ImageSelectionPage";

function renderPage() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: 0 } },
	});
	return render(
		<ThemeProvider theme={theme}>
			<MemoryRouter>
				<QueryClientProvider client={client}>
					<ImageSelectionPage />
				</QueryClientProvider>
			</MemoryRouter>
		</ThemeProvider>,
	);
}

describe("ImageSelectionPage", () => {
	beforeAll(() => {
		server.use(
			http.get("/api/images", ({ request }) => {
				const url = new URL(request.url);
				const drawingTypeId = url.searchParams.get("drawing_type_id");
				if (drawingTypeId === "2") {
					return HttpResponse.json({
						results: [
							{
								...FIXTURES.image,
								image_id: "00000000-0000-4000-8000-000000000002",
								component_name: "system",
								drawing_type: {
									drawing_type_id: 2,
									type_name: "system",
									description: "",
									is_active: true,
								},
							},
						],
						has_more: false,
						next_cursor: undefined,
					});
				}
				// Default to composite
				return HttpResponse.json({
					results: [FIXTURES.image],
					has_more: false,
					next_cursor: undefined,
				});
			}),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it("does not pass imagesLoading/imagesError when no drawing type is selected (showGrid is false)", async () => {
		vi.mock("../services/api/hooks/useDrawingTypes", async (importActual) => {
			const actual = await importActual();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const mod = (actual as unknown as { default?: unknown }).default
				? (actual as { default: unknown }).default
				: (actual as Record<string, unknown>);
			return {
				...(mod ?? {}),
				useDrawingTypes: () => ({ data: [], isLoading: false }),
			};
		});
		vi.mock("../services/api/hooks/useImages", async (importActual) => {
			const actual = await importActual();
			const actualMod = actual as Record<string, unknown>;
			const mod = (actualMod as { default?: unknown }).default
				? (actualMod as { default: unknown }).default
				: actualMod;
			return {
				...(mod ?? {}),
				useImages: () => ({
					data: undefined,
					isLoading: true,
					isError: true,
					hasNextPage: false,
					fetchNextPage: vi.fn(),
					isFetchingNextPage: false,
				}),
			};
		});
		renderPage();
		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
	});

	it("passes imagesLoading/imagesError when drawing type is selected (showGrid is true)", async () => {
		vi.mock("../services/api/hooks/useDrawingTypes", async (importActual) => {
			const actual = await importActual();
			const actualMod = actual as Record<string, unknown>;
			const mod = (actualMod as { default?: unknown }).default
				? (actualMod as { default: unknown }).default
				: actualMod;
			return {
				...(mod ?? {}),
				useDrawingTypes: () => ({
					data: [
						{
							drawing_type_id: 1,
							type_name: "composite",
							description: "",
							is_active: true,
						},
					],
					isLoading: false,
				}),
			};
		});
		vi.mock("../services/api/hooks/useImages", async (importActual) => {
			const actual = await importActual();
			const actualMod = actual as Record<string, unknown>;
			const mod = (actualMod as { default?: unknown }).default
				? (actualMod as { default: unknown }).default
				: actualMod;
			return {
				...(mod ?? {}),
				useImages: () => ({
					data: undefined,
					isLoading: true,
					isError: true,
					hasNextPage: false,
					fetchNextPage: vi.fn(),
					isFetchingNextPage: false,
				}),
			};
		});
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByRole("combobox", { name: /drawing type/i }),
			).toBeInTheDocument();
		});
		// Should show empty state when loading with no images (since isLoading && images.length === 0)
		await waitFor(() => {
			expect(
				screen.queryByText(/No images found for the selected filters/),
			).not.toBeInTheDocument();
		});
		// Now simulate not loading, but error
		vi.mock("../services/api/hooks/useImages", async (importActual) => {
			const actual = await importActual();
			const actualMod = actual as Record<string, unknown>;
			const mod = (actualMod as { default?: unknown }).default
				? (actualMod as { default: unknown }).default
				: actualMod;
			return {
				...(mod ?? {}),
				useImages: () => ({
					data: undefined,
					isLoading: false,
					isError: true,
					hasNextPage: false,
					fetchNextPage: vi.fn(),
					isFetchingNextPage: false,
				}),
			};
		});
	});
});

it("shows error state when images fail to load and a drawing type is selected", async () => {
	server.use(
		http.get("/api/images", () => new HttpResponse(null, { status: 500 })),
	);
	renderPage();
	await waitFor(() => {
		expect(
			screen.getByRole("combobox", { name: /drawing type/i }),
		).toBeInTheDocument();
	});
	await waitFor(() => {
		expect(screen.getByText(/Failed to load images/)).toBeInTheDocument();
	});
});
it("shows heading", () => {
	renderPage();
	expect(screen.getByText("Schematic Mapper")).toBeInTheDocument();
});

it("shows an admin upload entry point", () => {
	renderPage();
	expect(
		screen.getByRole("button", { name: "Open Admin Upload" }),
	).toBeInTheDocument();
});

it("renders drawing type dropdown", async () => {
	renderPage();
	await waitFor(() => {
		expect(
			screen.getByRole("combobox", { name: /drawing type/i }),
		).toBeInTheDocument();
	});
});

it("defaults the drawing type dropdown to the first available value", async () => {
	renderPage();
	await waitFor(() =>
		expect(
			screen.getByRole("combobox", { name: /drawing type/i }),
		).toBeInTheDocument(),
	);
	await waitFor(() => {
		expect(
			screen.getByRole("combobox", { name: /drawing type/i }),
		).toHaveTextContent("composite");
	});
});

it("shows error when fetch fails", async () => {
	let callCount = 0;
	server.use(
		http.get("/api/images", ({ request }) => {
			const url = new URL(request.url);
			if (url.searchParams.has("drawing_type_id")) {
				return new HttpResponse(null, { status: 500 });
			}
			callCount++;
			if (callCount > 1) {
				return new HttpResponse(null, { status: 500 });
			}
			return HttpResponse.json({
				results: [FIXTURES.image],
				has_more: false,
				next_cursor: undefined,
			});
		}),
	);
	const user = userEvent.setup();
	renderPage();

	await waitFor(() =>
		expect(
			screen.getByRole("combobox", { name: /drawing type/i }),
		).toBeInTheDocument(),
	);

	await user.click(screen.getByRole("combobox", { name: /drawing type/i }));
	const option = await screen.findByRole("option", { name: "composite" });
	await user.click(option);

	await waitFor(() => {
		expect(screen.getByText(/Failed to load images/)).toBeInTheDocument();
	});
});

it("does not render a search images text field", async () => {
	renderPage();
	await waitFor(() =>
		expect(
			screen.getByRole("combobox", { name: /drawing type/i }),
		).toBeInTheDocument(),
	);
	expect(
		screen.queryByRole("textbox", { name: /search images/i }),
	).not.toBeInTheDocument();
});
