import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import ImageSelectionTemplate from "./ImageSelectionTemplate";

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

describe("ImageSelectionTemplate", () => {
	it("renders header, description, and state slot", () => {
		renderWithProviders(
			<ImageSelectionTemplate
				title="Test App"
				description="Pick a type"
				drawingTypes={[]}
				selectedTypeId={null}
				onTypeChange={vi.fn()}
				images={[]}
				onImageClick={vi.fn()}
				showGrid={false}
				stateSlot={<div>empty state</div>}
			/>,
		);
		expect(screen.getByText("Test App")).toBeInTheDocument();
		expect(screen.getByText("Pick a type")).toBeInTheDocument();
		expect(screen.getByText("empty state")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Open Admin Upload" }),
		).toBeInTheDocument();
	});

	it("calls onOpenAdmin when the admin button is clicked", async () => {
		const onOpenAdmin = vi.fn();
		renderWithProviders(
			<ImageSelectionTemplate
				title="Test App"
				description="Pick a type"
				drawingTypes={[]}
				selectedTypeId={null}
				onTypeChange={vi.fn()}
				images={[]}
				onImageClick={vi.fn()}
				onOpenAdmin={onOpenAdmin}
				showGrid={false}
				stateSlot={<div>empty state</div>}
			/>,
		);

		await userEvent.click(
			screen.getByRole("button", { name: "Open Admin Upload" }),
		);
		expect(onOpenAdmin).toHaveBeenCalledTimes(1);
	});
});
