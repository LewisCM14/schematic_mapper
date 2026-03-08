import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import theme from "../theme";
import AdminPage from "./AdminPage";

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
					<AdminPage />
				</QueryClientProvider>
			</MemoryRouter>
		</ThemeProvider>,
	);
}

describe("AdminPage", () => {
	it("renders stepper with all 5 steps", async () => {
		renderPage();
		await waitFor(() => {
			expect(screen.getByText("Select Type")).toBeInTheDocument();
			expect(screen.getByText("Upload Image")).toBeInTheDocument();
			expect(screen.getByText("Confirm Upload")).toBeInTheDocument();
			expect(screen.getByText("Map Positions")).toBeInTheDocument();
			expect(screen.getByText("Save")).toBeInTheDocument();
		});
	});

	it("Next button is disabled until a drawing type is selected", async () => {
		renderPage();
		await waitFor(() => {
			expect(
				screen.getByRole("combobox", { name: /drawing type/i }),
			).toBeInTheDocument();
		});
		expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
	});

	it("advances to Upload step after selecting a drawing type", async () => {
		renderPage();

		await waitFor(() => {
			expect(screen.getByText("Select Type")).toBeInTheDocument();
		});

		const select = screen.getByRole("combobox", { name: /drawing type/i });
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

		await waitFor(() => screen.getByText("Select Type"));
		const select = screen.getByRole("combobox", { name: /drawing type/i });
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
});
