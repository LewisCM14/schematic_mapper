import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import AdminMappingTemplate from "./AdminMappingTemplate";

function renderWithProviders(ui: React.ReactElement) {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={qc}>
			<ThemeProvider theme={theme}>
				<MemoryRouter>{ui}</MemoryRouter>
			</ThemeProvider>
		</QueryClientProvider>,
	);
}

describe("AdminMappingTemplate", () => {
	it("renders header, stepper, and children slot", () => {
		renderWithProviders(
			<AdminMappingTemplate
				title="Admin Panel"
				steps={["Step A", "Step B", "Step C"]}
				activeStep={1}
				showDisclaimer={false}
				onDismissDisclaimer={vi.fn()}
			>
				<div>step content</div>
			</AdminMappingTemplate>,
		);
		expect(screen.getByText("Admin Panel")).toBeInTheDocument();
		expect(screen.getByText("Step A")).toBeInTheDocument();
		expect(screen.getByText("Step B")).toBeInTheDocument();
		expect(screen.getByText("Step C")).toBeInTheDocument();
		expect(screen.getByText("step content")).toBeInTheDocument();
	});

	it("renders disclaimer when showDisclaimer is true", () => {
		renderWithProviders(
			<AdminMappingTemplate
				title="Admin Panel"
				steps={["A"]}
				activeStep={0}
				showDisclaimer={true}
				onDismissDisclaimer={vi.fn()}
			>
				<div />
			</AdminMappingTemplate>,
		);
		expect(
			screen.getByText(/unprotected in the prototype/),
		).toBeInTheDocument();
	});
});
