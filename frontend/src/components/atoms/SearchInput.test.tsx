import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import SearchInput from "./SearchInput";

function renderInput(props: Partial<Parameters<typeof SearchInput>[0]> = {}) {
	const defaults = {
		value: "",
		onChange: vi.fn(),
		...props,
	};
	return {
		onChange: defaults.onChange,
		...render(
			<ThemeProvider theme={theme}>
				<SearchInput {...defaults} />
			</ThemeProvider>,
		),
	};
}

describe("SearchInput", () => {
	it("renders with default label", () => {
		renderInput();
		expect(
			screen.getByRole("textbox", { name: /search/i }),
		).toBeInTheDocument();
	});

	it("calls onChange when typing", async () => {
		const { onChange } = renderInput();
		const input = screen.getByRole("textbox", { name: /search/i });
		await userEvent.type(input, "a");
		expect(onChange).toHaveBeenCalledWith("a");
	});

	it("shows clear button when value is set and onClear provided", () => {
		renderInput({ value: "test", onClear: vi.fn() });
		expect(
			screen.getByRole("button", { name: "clear search" }),
		).toBeInTheDocument();
	});
});
