import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../theme";
import ViewerFooterStatusBar from "./ViewerFooterStatusBar";

function renderFooter(
	props: {
		sourceStatus?: Record<string, string>;
		requestId?: string | null;
		lastRefreshed?: Date | null;
		zoomLevel?: number;
	} = {},
) {
	return render(
		<ThemeProvider theme={theme}>
			<ViewerFooterStatusBar
				sourceStatus={props.sourceStatus ?? {}}
				requestId={props.requestId ?? null}
				lastRefreshed={props.lastRefreshed ?? null}
				zoomLevel={props.zoomLevel ?? 1}
			/>
		</ThemeProvider>,
	);
}

describe("ViewerFooterStatusBar", () => {
	it("renders source status chips with correct labels", () => {
		renderFooter({ sourceStatus: { internal: "ok", asset: "degraded" } });
		expect(screen.getByText("internal: ok")).toBeInTheDocument();
		expect(screen.getByText("asset: degraded")).toBeInTheDocument();
	});

	it("displays request ID when provided", () => {
		renderFooter({ requestId: "req-abc-123" });
		expect(screen.getByText(/req-abc-123/)).toBeInTheDocument();
	});

	it("does not render request ID section when requestId is null", () => {
		renderFooter({ requestId: null });
		expect(screen.queryByText(/req:/)).not.toBeInTheDocument();
	});

	it("formats zoom level to one decimal place", () => {
		renderFooter({ zoomLevel: 2.5 });
		expect(screen.getByText("2.5×")).toBeInTheDocument();
	});

	it("formats zoom level 1 as 1.0×", () => {
		renderFooter({ zoomLevel: 1 });
		expect(screen.getByText("1.0×")).toBeInTheDocument();
	});

	it("ok source chip has success color class", () => {
		renderFooter({ sourceStatus: { internal: "ok" } });
		const chip = screen.getByText("internal: ok").closest(".MuiChip-root");
		expect(chip).toHaveClass("MuiChip-colorSuccess");
	});

	it("degraded source chip has warning color class", () => {
		renderFooter({ sourceStatus: { asset: "degraded" } });
		const chip = screen.getByText("asset: degraded").closest(".MuiChip-root");
		expect(chip).toHaveClass("MuiChip-colorWarning");
	});

	it("error source chip has error color class", () => {
		renderFooter({ sourceStatus: { sensor: "error" } });
		const chip = screen.getByText("sensor: error").closest(".MuiChip-root");
		expect(chip).toHaveClass("MuiChip-colorError");
	});
});
