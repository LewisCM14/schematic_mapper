import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import SearchResultItemComponent from "./SearchResultItem";

const RESULT = {
	fitting_position_id: "FP-PUMP-01-INLET",
	label_text: "FP-PUMP-01-INLET",
	image_id: "00000000-0000-4000-8000-000000000001",
	x_coordinate: 300,
	y_coordinate: 250,
	component_name: "Cooling System Assembly",
	matched_source: "internal",
	matched_field: "label_text",
	match_type: "exact" as const,
};

function renderItem(onSelect = vi.fn()) {
	return render(
		<ThemeProvider theme={theme}>
			<SearchResultItemComponent result={RESULT} onSelect={onSelect} />
		</ThemeProvider>,
	);
}

describe("SearchResultItem", () => {
	it("renders the label text", () => {
		renderItem();
		expect(screen.getByText("FP-PUMP-01-INLET")).toBeInTheDocument();
	});

	it("renders the component name", () => {
		renderItem();
		expect(screen.getByText("Cooling System Assembly")).toBeInTheDocument();
	});

	it("renders the match type badge", () => {
		renderItem();
		expect(screen.getByText("exact")).toBeInTheDocument();
	});

	it("renders the matched source badge", () => {
		renderItem();
		expect(screen.getByText("internal")).toBeInTheDocument();
	});

	it("calls onSelect with result on click", async () => {
		const onSelect = vi.fn();
		const user = userEvent.setup();
		renderItem(onSelect);
		await user.click(screen.getByText("FP-PUMP-01-INLET"));
		expect(onSelect).toHaveBeenCalledWith(RESULT);
	});
});
