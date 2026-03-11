import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FIXTURES, server } from "../test/handlers";
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
			expect(screen.getByRole("combobox", { name: /drawing type/i })).toHaveTextContent(
				"composite",
			);
		});
	});

	it("shows image cards once the default drawing type is applied", async () => {
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByText("Cooling System Assembly"),
			).toBeInTheDocument();
		});
	});

	it("shows image cards after selecting a drawing type", async () => {
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
			expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument();
		});
		expect(screen.getAllByText("composite").length).toBeGreaterThan(0);
		expect(screen.getByText("800 × 600 px")).toBeInTheDocument();
	});

	it("navigates to viewer on card click", async () => {
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

		await waitFor(() =>
			expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument(),
		);
		await user.click(screen.getByText("Cooling System Assembly"));
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
					next_cursor: null,
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

	it("updates displayed tiles when the drawing type changes", async () => {
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
								component_name: "System Overview",
								drawing_type: {
									drawing_type_id: 2,
									type_name: "system",
									description: "",
									is_active: true,
								},
							},
						],
						has_more: false,
						next_cursor: null,
					});
				}
				return HttpResponse.json({
					results: [FIXTURES.image],
					has_more: false,
					next_cursor: null,
				});
			}),
		);
		server.use(
			http.get("/api/drawing-types", () =>
				HttpResponse.json([
					...FIXTURES.drawingTypes,
					{
						drawing_type_id: 2,
						type_name: "system",
						description: "",
						is_active: true,
					},
				]),
			),
		);
		const user = userEvent.setup();
		renderPage();

		await waitFor(() =>
			expect(
				screen.getByRole("combobox", { name: /drawing type/i }),
			).toBeInTheDocument(),
		);

		await user.click(screen.getByRole("combobox", { name: /drawing type/i }));
		const option = await screen.findByRole("option", { name: "system" });
		await user.click(option);

		await waitFor(() => {
			expect(screen.getByText("System Overview")).toBeInTheDocument();
		});
	});
});
