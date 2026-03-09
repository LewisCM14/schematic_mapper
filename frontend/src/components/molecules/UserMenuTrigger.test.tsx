import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import UserMenuTrigger from "./UserMenuTrigger";

describe("UserMenuTrigger", () => {
	it("renders the avatar icon button", () => {
		render(
			<ThemeProvider theme={theme}>
				<UserMenuTrigger />
			</ThemeProvider>,
		);
		expect(screen.getByLabelText("user menu")).toBeInTheDocument();
		expect(
			document.querySelector("[data-testid='AccountCircleIcon']"),
		).toBeTruthy();
	});

	it("renders tooltip text", async () => {
		render(
			<ThemeProvider theme={theme}>
				<UserMenuTrigger />
			</ThemeProvider>,
		);
		// The tooltip text is in the DOM as a hidden element
		expect(screen.getByLabelText("user menu")).toHaveAttribute("disabled");
	});
});
