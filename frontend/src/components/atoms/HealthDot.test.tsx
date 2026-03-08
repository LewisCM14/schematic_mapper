import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import HealthDot from "./HealthDot";

function renderDot(status: "ok" | "degraded" | "error") {
	return render(
		<ThemeProvider theme={theme}>
			<HealthDot status={status} />
		</ThemeProvider>,
	);
}

describe("HealthDot", () => {
	it("renders with aria-label for ok status", () => {
		renderDot("ok");
		expect(screen.getByLabelText("status: ok")).toBeInTheDocument();
	});

	it("renders with aria-label for degraded status", () => {
		renderDot("degraded");
		expect(screen.getByLabelText("status: degraded")).toBeInTheDocument();
	});

	it("renders with aria-label for error status", () => {
		renderDot("error");
		expect(screen.getByLabelText("status: error")).toBeInTheDocument();
	});
});
