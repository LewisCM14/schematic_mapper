import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import StatusChip from "./StatusChip";

function renderChip(status: "ok" | "degraded" | "error") {
	return render(
		<ThemeProvider theme={theme}>
			<StatusChip status={status} />
		</ThemeProvider>,
	);
}

describe("StatusChip", () => {
	it("renders ok status", () => {
		renderChip("ok");
		expect(screen.getByText("ok")).toBeInTheDocument();
	});

	it("renders degraded status", () => {
		renderChip("degraded");
		expect(screen.getByText("degraded")).toBeInTheDocument();
	});

	it("renders error status", () => {
		renderChip("error");
		expect(screen.getByText("error")).toBeInTheDocument();
	});

	it("applies success color for ok status", () => {
		renderChip("ok");
		const chip = screen.getByText("ok").closest(".MuiChip-root");
		expect(chip).toHaveClass("MuiChip-colorSuccess");
	});

	it("applies warning color for degraded status", () => {
		renderChip("degraded");
		const chip = screen.getByText("degraded").closest(".MuiChip-root");
		expect(chip).toHaveClass("MuiChip-colorWarning");
	});

	it("applies error color for error status", () => {
		renderChip("error");
		const chip = screen.getByText("error").closest(".MuiChip-root");
		expect(chip).toHaveClass("MuiChip-colorError");
	});

	it("has visible text label (not colour alone)", () => {
		for (const status of ["ok", "degraded", "error"] as const) {
			const { unmount } = renderChip(status);
			expect(screen.getByText(status)).toBeVisible();
			unmount();
		}
	});
});
