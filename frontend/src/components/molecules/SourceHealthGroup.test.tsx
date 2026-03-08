import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import SourceHealthGroup from "./SourceHealthGroup";

function renderGroup(sourceName: string, status: "ok" | "degraded" | "error") {
	return render(
		<ThemeProvider theme={theme}>
			<SourceHealthGroup sourceName={sourceName} status={status} />
		</ThemeProvider>,
	);
}

describe("SourceHealthGroup", () => {
	it("renders the source name label", () => {
		renderGroup("internal", "ok");
		expect(screen.getByText("internal")).toBeInTheDocument();
	});

	it("renders a HealthDot with the correct status aria-label", () => {
		renderGroup("asset", "degraded");
		expect(screen.getByLabelText("status: degraded")).toBeInTheDocument();
	});

	it("renders source name and status dot together", () => {
		renderGroup("sensor", "error");
		expect(screen.getByText("sensor")).toBeInTheDocument();
		expect(screen.getByLabelText("status: error")).toBeInTheDocument();
	});
});
