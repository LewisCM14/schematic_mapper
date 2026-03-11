import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import ImageSelectionFilters from "./ImageSelectionFilters";

describe("ImageSelectionFilters", () => {
	it("renders filter bar with drawing type selector", () => {
		render(
			<ThemeProvider theme={theme}>
				<ImageSelectionFilters
					drawingTypes={[
						{
							drawing_type_id: 1,
							type_name: "composite",
							description: "",
							is_active: true,
						},
					]}
					selectedTypeId={null}
					onTypeChange={vi.fn()}
				/>
			</ThemeProvider>,
		);
		expect(
			screen.getByRole("combobox", { name: /drawing type/i }),
		).toBeInTheDocument();
	});
});
