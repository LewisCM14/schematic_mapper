import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import FilterBar from "./FilterBar";

const DRAWING_TYPES = [
	{
		drawing_type_id: 1,
		type_name: "composite",
		description: "",
		is_active: true,
	},
	{
		drawing_type_id: 2,
		type_name: "system",
		description: "",
		is_active: true,
	},
];

function renderBar(
	selectedTypeId: string | null = null,
	onTypeChange = vi.fn(),
) {
	return render(
		<ThemeProvider theme={theme}>
			<FilterBar
				drawingTypes={DRAWING_TYPES}
				selectedTypeId={selectedTypeId}
				onTypeChange={onTypeChange}
			/>
		</ThemeProvider>,
	);
}

describe("FilterBar", () => {
	it("renders the drawing type dropdown", () => {
		renderBar();
		expect(
			screen.getByRole("combobox", { name: /drawing type/i }),
		).toBeInTheDocument();
	});

	it("renders all drawing type options when opened", async () => {
		const user = userEvent.setup();
		renderBar();
		await user.click(screen.getByRole("combobox", { name: /drawing type/i }));
		expect(
			await screen.findByRole("option", { name: "composite" }),
		).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "system" })).toBeInTheDocument();
	});

	it("calls onTypeChange when an option is selected", async () => {
		const onTypeChange = vi.fn();
		const user = userEvent.setup();
		renderBar(null, onTypeChange);
		await user.click(screen.getByRole("combobox", { name: /drawing type/i }));
		await user.click(await screen.findByRole("option", { name: "composite" }));
		expect(onTypeChange).toHaveBeenCalledWith("1");
	});

	it("shows selected type when selectedTypeId is set", () => {
		renderBar("1");
		expect(screen.getByText("composite")).toBeInTheDocument();
	});
});
