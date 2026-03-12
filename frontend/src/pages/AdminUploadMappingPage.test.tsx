import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "../test/handlers";
import theme from "../theme";
import AdminUploadMappingPage from "./AdminUploadMappingPage";

const { mockNavigate } = vi.hoisted(() => ({
	mockNavigate: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
	const actual =
		await vi.importActual<typeof import("react-router-dom")>(
			"react-router-dom",
		);
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

function renderPage() {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false, gcTime: 0 },
			mutations: { retry: false },
		},
	});
	return render(
		<ThemeProvider theme={theme}>
			<MemoryRouter>
				<QueryClientProvider client={client}>
					<AdminUploadMappingPage />
				</QueryClientProvider>
			</MemoryRouter>
		</ThemeProvider>,
	);
}

describe("AdminUploadMappingPage", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		mockNavigate.mockReset();
	});

	it("renders stepper with all 5 steps", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Select Type")).toBeInTheDocument();
			expect(screen.getByText("Upload Image")).toBeInTheDocument();
			expect(screen.getByText("Select Image")).toBeInTheDocument();
			expect(screen.getByText("Map Positions")).toBeInTheDocument();
			expect(screen.getByText("Save")).toBeInTheDocument();
		});
	});

	it("Step 3 renders image tiles after upload and clicking a tile advances to Step 4", async () => {
		vi.spyOn(crypto.subtle, "digest").mockResolvedValue(new ArrayBuffer(32));

		renderPage();

		// Step 1 — select drawing type
		const select = await screen.findByRole("combobox", {
			name: /drawing type/i,
		});
		await userEvent.click(select);
		const option = await screen.findByRole("option", {
			name: "composite",
		});
		await userEvent.click(option);
		await userEvent.click(screen.getByRole("button", { name: /next/i }));

		// Step 2 — upload
		await waitFor(() =>
			screen.getByRole("textbox", { name: /component name/i }),
		);
		await userEvent.type(
			screen.getByRole("textbox", { name: /component name/i }),
			"Pump Assembly",
		);

		const file = new File(["<svg/>"], "test.svg", {
			type: "image/svg+xml",
		});
		const fileInput =
			document.querySelector<HTMLInputElement>('input[type="file"]');
		fireEvent.change(fileInput as HTMLInputElement, {
			target: { files: [file] },
		});

		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /^upload$/i }),
			).not.toBeDisabled(),
		);
		await userEvent.click(screen.getByRole("button", { name: /^upload$/i }));

		// Step 3 — select image: should show an image tile
		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Select Image" }),
			).toBeInTheDocument();
			expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument();
		});

		// Click the tile to advance to Step 4
		await userEvent.click(screen.getByText("Cooling System Assembly"));

		await waitFor(() => {
			expect(screen.getByText("Map Fitting Positions")).toBeInTheDocument();
			expect(screen.getByTestId("diagram-canvas")).toBeInTheDocument();
			expect(
				screen.getByRole("tab", { name: "unmapped tab" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("tab", { name: "mapped tab" }),
			).toBeInTheDocument();
		});
	}, 10000);

	it("Step 3 back button returns to Upload Image without auto-forwarding again", async () => {
		vi.spyOn(crypto.subtle, "digest").mockResolvedValue(new ArrayBuffer(32));

		renderPage();

		const select = await screen.findByRole("combobox", {
			name: /drawing type/i,
		});
		await userEvent.click(select);
		const option = await screen.findByRole("option", { name: "composite" });
		await userEvent.click(option);
		await userEvent.click(screen.getByRole("button", { name: /next/i }));

		await waitFor(() =>
			screen.getByRole("textbox", { name: /component name/i }),
		);
		await userEvent.type(
			screen.getByRole("textbox", { name: /component name/i }),
			"Pump Assembly",
		);

		const file = new File(["<svg/>"], "test.svg", { type: "image/svg+xml" });
		const fileInput =
			document.querySelector<HTMLInputElement>('input[type="file"]');
		fireEvent.change(fileInput as HTMLInputElement, {
			target: { files: [file] },
		});

		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /^upload$/i }),
			).not.toBeDisabled(),
		);
		await userEvent.click(screen.getByRole("button", { name: /^upload$/i }));

		await waitFor(() =>
			expect(
				screen.getByRole("heading", { name: "Select Image" }),
			).toBeInTheDocument(),
		);

		await userEvent.click(screen.getByRole("button", { name: "Back" }));

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Upload Image" }),
			).toBeInTheDocument();
		});
	}, 10000);

	it("shows the backend duplicate-name validation message during upload", async () => {
		vi.spyOn(crypto.subtle, "digest").mockResolvedValue(new ArrayBuffer(32));

		server.use(
			http.post("/api/admin/uploads", () =>
				HttpResponse.json(
					{
						error:
							"Component name already exists. Names must be unique ignoring letter case and surrounding whitespace.",
						code: "duplicate_component_name",
						status: 409,
					},
					{ status: 409 },
				),
			),
		);

		renderPage();

		const select = await screen.findByRole("combobox", {
			name: /drawing type/i,
		});
		await userEvent.click(select);
		const option = await screen.findByRole("option", { name: "composite" });
		await userEvent.click(option);
		await userEvent.click(screen.getByRole("button", { name: /next/i }));

		await userEvent.type(
			screen.getByRole("textbox", { name: /component name/i }),
			"Cooling Assembly",
		);
		const file = new File(["<svg/>"], "test.svg", { type: "image/svg+xml" });
		const fileInput =
			document.querySelector<HTMLInputElement>('input[type="file"]');
		fireEvent.change(fileInput as HTMLInputElement, {
			target: { files: [file] },
		});

		await userEvent.click(screen.getByRole("button", { name: /^upload$/i }));

		await waitFor(() => {
			expect(
				screen.getByText(
					"Component name already exists. Names must be unique ignoring letter case and surrounding whitespace.",
				),
			).toBeInTheDocument();
		});
	});

	it("Next button is disabled until a drawing type is selected", async () => {
		renderPage();
		await screen.findByRole("combobox", { name: /drawing type/i });
		expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
	});

	it("allows jumping straight to Select Image to edit existing mappings", async () => {
		renderPage();

		await userEvent.click(
			await screen.findByRole("button", { name: /select existing image/i }),
		);

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Select Image" }),
			).toBeInTheDocument();
		});
	});

	it("advances to Upload step after selecting a drawing type", async () => {
		renderPage();

		const select = await screen.findByRole("combobox", {
			name: /drawing type/i,
		});
		await userEvent.click(select);
		const option = await screen.findByRole("option", { name: "composite" });
		await userEvent.click(option);

		const nextBtn = screen.getByRole("button", { name: /next/i });
		expect(nextBtn).not.toBeDisabled();
		await userEvent.click(nextBtn);

		await waitFor(() => {
			expect(
				screen.getByRole("textbox", { name: /component name/i }),
			).toBeInTheDocument();
		});
	});

	it("Upload button is disabled when no file is selected", async () => {
		renderPage();

		const select = await screen.findByRole("combobox", {
			name: /drawing type/i,
		});
		await userEvent.click(select);
		const option = await screen.findByRole("option", { name: "composite" });
		await userEvent.click(option);
		await userEvent.click(screen.getByRole("button", { name: /next/i }));

		await waitFor(() => {
			expect(screen.getByRole("button", { name: /upload/i })).toBeDisabled();
		});
	});

	it("shows canvas in Map Positions step", async () => {
		renderPage();

		await waitFor(() => screen.getByText("Select Type"));
		expect(screen.getByText("Map Positions")).toBeInTheDocument();
	});

	it("renders the prototype disclaimer banner", async () => {
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByText(/unprotected in the prototype build/i),
			).toBeInTheDocument();
		});
	});

	it("dismisses the disclaimer banner when closed", async () => {
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByText(/unprotected in the prototype build/i),
			).toBeInTheDocument();
		});
		const closeBtn = screen.getByRole("button", { name: /close/i });
		await userEvent.click(closeBtn);
		expect(
			screen.queryByText(/unprotected in the prototype build/i),
		).not.toBeInTheDocument();
	});

	it("shows error when finalize fails with checksum mismatch", async () => {
		// jsdom's File.arrayBuffer() returns a cross-realm ArrayBuffer that
		// SubtleCrypto.digest() rejects. Provide a stub hash so the upload
		// flow reaches the finalize step where our MSW override returns 422.
		vi.spyOn(crypto.subtle, "digest").mockResolvedValue(new ArrayBuffer(32));

		server.use(
			http.post("/api/admin/uploads/:id/complete", () =>
				HttpResponse.json(
					{ error: "Checksum mismatch", code: "checksum_mismatch" },
					{ status: 422 },
				),
			),
		);
		renderPage();

		// Navigate to the upload step
		const select = await screen.findByRole("combobox", {
			name: /drawing type/i,
		});
		await userEvent.click(select);
		const option = await screen.findByRole("option", { name: "composite" });
		await userEvent.click(option);
		await userEvent.click(screen.getByRole("button", { name: /next/i }));

		await waitFor(() =>
			screen.getByRole("textbox", { name: /component name/i }),
		);
		await userEvent.type(
			screen.getByRole("textbox", { name: /component name/i }),
			"Pump Assembly",
		);

		const file = new File(["<svg/>"], "test.svg", { type: "image/svg+xml" });
		const fileInput =
			document.querySelector<HTMLInputElement>('input[type="file"]');
		fireEvent.change(fileInput as HTMLInputElement, {
			target: { files: [file] },
		});

		// Wait for React to flush the file state update (button becomes enabled)
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /^upload$/i }),
			).not.toBeDisabled(),
		);
		await userEvent.click(screen.getByRole("button", { name: /^upload$/i }));

		// An error alert should appear (the disclaimer warning alert is unrelated)
		await waitFor(() => {
			const alerts = screen.getAllByRole("alert");
			expect(
				alerts.some((a) => /checksum mismatch/i.test(a.textContent ?? "")),
			).toBe(true);
		});
	});

	it("abort after failed finalize clears upload state", async () => {
		vi.spyOn(crypto.subtle, "digest").mockResolvedValue(new ArrayBuffer(32));

		server.use(
			http.post("/api/admin/uploads/:id/complete", () =>
				HttpResponse.json(
					{ error: "Checksum mismatch", code: "checksum_mismatch" },
					{ status: 422 },
				),
			),
		);
		renderPage();

		// Navigate to the upload step
		const select = await screen.findByRole("combobox", {
			name: /drawing type/i,
		});
		await userEvent.click(select);
		const option = await screen.findByRole("option", { name: "composite" });
		await userEvent.click(option);
		await userEvent.click(screen.getByRole("button", { name: /next/i }));

		await waitFor(() =>
			screen.getByRole("textbox", { name: /component name/i }),
		);
		await userEvent.type(
			screen.getByRole("textbox", { name: /component name/i }),
			"Pump Assembly",
		);

		const file = new File(["<svg/>"], "test.svg", { type: "image/svg+xml" });
		const fileInput =
			document.querySelector<HTMLInputElement>('input[type="file"]');
		fireEvent.change(fileInput as HTMLInputElement, {
			target: { files: [file] },
		});

		// Wait for React to flush the file state update
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /^upload$/i }),
			).not.toBeDisabled(),
		);
		await userEvent.click(screen.getByRole("button", { name: /^upload$/i }));

		// After a failed finalize uploadId is still set → Abort button becomes visible
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /abort/i }),
			).toBeInTheDocument(),
		);

		// Abort the upload session
		await userEvent.click(screen.getByRole("button", { name: /abort/i }));

		// Abort button disappears and error message is cleared
		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: /abort/i }),
			).not.toBeInTheDocument(),
		);
		const remainingAlerts = screen.queryAllByRole("alert");
		expect(
			remainingAlerts.every(
				(a) => !/request failed/i.test(a.textContent ?? ""),
			),
		).toBe(true);
	});

	it("Step 1 shows loading state while fetching drawing types", async () => {
		server.use(
			http.get("/api/drawing-types", async () => {
				await new Promise(() => {}); // never resolves
			}),
		);
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByLabelText("loading drawing types"),
			).toBeInTheDocument();
		});
	});

	it("Step 1 shows error state when fetching drawing types fails", async () => {
		server.use(
			http.get(
				"/api/drawing-types",
				() => new HttpResponse(null, { status: 500 }),
			),
		);
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByText("Failed to load drawing types."),
			).toBeInTheDocument();
		});
	});

	it("Step 1 shows empty state when no drawing types available", async () => {
		server.use(http.get("/api/drawing-types", () => HttpResponse.json([])));
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByText("No drawing types available."),
			).toBeInTheDocument();
		});
	});

	it("action footer renders during Step 4 with validation summary", async () => {
		vi.spyOn(crypto.subtle, "digest").mockResolvedValue(new ArrayBuffer(32));

		renderPage();

		// Step 1 — select drawing type
		const select = await screen.findByRole("combobox", {
			name: /drawing type/i,
		});
		await userEvent.click(select);
		const option = await screen.findByRole("option", { name: "composite" });
		await userEvent.click(option);
		await userEvent.click(screen.getByRole("button", { name: /next/i }));

		// Step 2 — upload
		await waitFor(() =>
			screen.getByRole("textbox", { name: /component name/i }),
		);
		await userEvent.type(
			screen.getByRole("textbox", { name: /component name/i }),
			"Pump Assembly",
		);

		const file = new File(["<svg/>"], "test.svg", { type: "image/svg+xml" });
		const fileInput =
			document.querySelector<HTMLInputElement>('input[type="file"]');
		fireEvent.change(fileInput as HTMLInputElement, {
			target: { files: [file] },
		});

		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /^upload$/i }),
			).not.toBeDisabled(),
		);
		await userEvent.click(screen.getByRole("button", { name: /^upload$/i }));

		// Step 3 — select image
		await waitFor(() => {
			expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument();
		});
		await userEvent.click(screen.getByText("Cooling System Assembly"));

		// Step 4 — Map Positions
		await waitFor(() => {
			expect(screen.getByText("Map Fitting Positions")).toBeInTheDocument();
		});

		// Footer should be visible
		expect(screen.getByTestId("admin-action-footer")).toBeInTheDocument();
		expect(screen.getByText("0 positions")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /^back$/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /review & save/i }),
		).toBeDisabled();
		expect(screen.getByRole("button", { name: /publish/i })).toBeDisabled();
	});

	it("blocks duplicate label text while mapping a single image", async () => {
		vi.spyOn(crypto.subtle, "digest").mockResolvedValue(new ArrayBuffer(32));

		renderPage();

		const select = await screen.findByRole("combobox", {
			name: /drawing type/i,
		});
		await userEvent.click(select);
		const option = await screen.findByRole("option", { name: "composite" });
		await userEvent.click(option);
		await userEvent.click(screen.getByRole("button", { name: /next/i }));

		await userEvent.type(
			screen.getByRole("textbox", { name: /component name/i }),
			"Pump Assembly",
		);
		const file = new File(["<svg/>"], "test.svg", { type: "image/svg+xml" });
		const fileInput =
			document.querySelector<HTMLInputElement>('input[type="file"]');
		fireEvent.change(fileInput as HTMLInputElement, {
			target: { files: [file] },
		});
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /^upload$/i }),
			).not.toBeDisabled(),
		);
		await userEvent.click(screen.getByRole("button", { name: /^upload$/i }));

		await waitFor(() => {
			expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument();
		});
		await userEvent.click(screen.getByText("Cooling System Assembly"));

		const canvasHost = (await screen.findByAltText("schematic diagram"))
			.parentElement;
		if (!canvasHost) {
			throw new Error("Expected diagram canvas host to exist");
		}
		vi.spyOn(canvasHost, "getBoundingClientRect").mockReturnValue({
			bottom: 600,
			height: 600,
			left: 0,
			right: 800,
			top: 0,
			width: 800,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		});

		fireEvent.pointerDown(canvasHost, {
			clientX: 100,
			clientY: 120,
			pointerId: 1,
		});
		fireEvent.pointerMove(canvasHost, {
			clientX: 220,
			clientY: 260,
			pointerId: 1,
		});
		fireEvent.pointerUp(canvasHost, {
			clientX: 220,
			clientY: 260,
			pointerId: 1,
		});
		await userEvent.type(
			screen.getByRole("textbox", { name: /marker label/i }),
			"FP-001",
		);
		await userEvent.click(screen.getByRole("button", { name: /confirm/i }));

		fireEvent.pointerDown(canvasHost, {
			clientX: 260,
			clientY: 300,
			pointerId: 2,
		});
		fireEvent.pointerMove(canvasHost, {
			clientX: 360,
			clientY: 380,
			pointerId: 2,
		});
		fireEvent.pointerUp(canvasHost, {
			clientX: 360,
			clientY: 380,
			pointerId: 2,
		});
		await userEvent.type(
			screen.getByRole("textbox", { name: /marker label/i }),
			"FP-001",
		);
		await userEvent.click(screen.getByRole("button", { name: /confirm/i }));

		expect(
			screen.getByText("Label text must be unique per image."),
		).toBeInTheDocument();
		expect(screen.getByText(/1 positions/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /confirm/i })).toBeDisabled();
	});

	it("does not render duplicate step-local back and save controls in mapping and save steps", async () => {
		vi.spyOn(crypto.subtle, "digest").mockResolvedValue(new ArrayBuffer(32));

		renderPage();

		const select = await screen.findByRole("combobox", {
			name: /drawing type/i,
		});
		await userEvent.click(select);
		const option = await screen.findByRole("option", { name: "composite" });
		await userEvent.click(option);
		await userEvent.click(screen.getByRole("button", { name: /next/i }));
		await userEvent.type(
			screen.getByRole("textbox", { name: /component name/i }),
			"Pump Assembly",
		);
		const file = new File(["<svg/>"], "test.svg", { type: "image/svg+xml" });
		const fileInput =
			document.querySelector<HTMLInputElement>('input[type="file"]');
		fireEvent.change(fileInput as HTMLInputElement, {
			target: { files: [file] },
		});
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /^upload$/i }),
			).not.toBeDisabled(),
		);
		await userEvent.click(screen.getByRole("button", { name: /^upload$/i }));
		await waitFor(() => {
			expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument();
		});
		await userEvent.click(screen.getByText("Cooling System Assembly"));

		expect(screen.getAllByRole("button", { name: /^back$/i })).toHaveLength(1);
		expect(
			screen.queryByRole("button", { name: /^save$/i }),
		).not.toBeInTheDocument();
		expect(
			screen.getAllByRole("button", { name: /review & save/i }),
		).toHaveLength(1);
	});

	it("Cancel in action footer returns to Step 3 and clears mapping state", async () => {
		vi.spyOn(crypto.subtle, "digest").mockResolvedValue(new ArrayBuffer(32));

		renderPage();

		// Navigate to Step 4
		const select = await screen.findByRole("combobox", {
			name: /drawing type/i,
		});
		await userEvent.click(select);
		const option = await screen.findByRole("option", { name: "composite" });
		await userEvent.click(option);
		await userEvent.click(screen.getByRole("button", { name: /next/i }));

		await waitFor(() =>
			screen.getByRole("textbox", { name: /component name/i }),
		);
		await userEvent.type(
			screen.getByRole("textbox", { name: /component name/i }),
			"Pump Assembly",
		);

		const file = new File(["<svg/>"], "test.svg", { type: "image/svg+xml" });
		const fileInput =
			document.querySelector<HTMLInputElement>('input[type="file"]');
		fireEvent.change(fileInput as HTMLInputElement, {
			target: { files: [file] },
		});

		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: /^upload$/i }),
			).not.toBeDisabled(),
		);
		await userEvent.click(screen.getByRole("button", { name: /^upload$/i }));

		await waitFor(() => {
			expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument();
		});
		await userEvent.click(screen.getByText("Cooling System Assembly"));

		await waitFor(() => {
			expect(screen.getByText("Map Fitting Positions")).toBeInTheDocument();
		});

		// Click Cancel in the footer
		await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

		// Should return to Step 3 (Select Image)
		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Select Image" }),
			).toBeInTheDocument();
		});

		// Footer should not be visible in Step 3
		expect(screen.queryByTestId("admin-action-footer")).not.toBeInTheDocument();
	});
});
