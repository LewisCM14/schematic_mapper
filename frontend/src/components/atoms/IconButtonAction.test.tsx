import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import IconButtonAction from "./IconButtonAction";

function renderBtn(
	props: Partial<Parameters<typeof IconButtonAction>[0]> = {},
) {
	const defaults = {
		icon: <span>X</span>,
		onClick: vi.fn(),
		ariaLabel: "test action",
		...props,
	};
	return {
		onClick: defaults.onClick,
		...render(
			<ThemeProvider theme={theme}>
				<IconButtonAction {...defaults} />
			</ThemeProvider>,
		),
	};
}

describe("IconButtonAction", () => {
	it("renders with aria-label", () => {
		renderBtn();
		expect(
			screen.getByRole("button", { name: "test action" }),
		).toBeInTheDocument();
	});

	it("calls onClick when pressed", async () => {
		const { onClick } = renderBtn();
		await userEvent.click(screen.getByRole("button", { name: "test action" }));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("renders as disabled when disabled prop is true", () => {
		renderBtn({ disabled: true });
		expect(screen.getByRole("button", { name: "test action" })).toBeDisabled();
	});
});
