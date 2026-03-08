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
	it("renders source name labels", () => {
		renderFooter({ sourceStatus: { internal: "ok", asset: "degraded" } });
		expect(screen.getByText("internal")).toBeInTheDocument();
		expect(screen.getByText("asset")).toBeInTheDocument();
	});

	it("renders a HealthDot for each source", () => {
		renderFooter({ sourceStatus: { internal: "ok", asset: "degraded" } });
		expect(screen.getByLabelText("status: ok")).toBeInTheDocument();
		expect(screen.getByLabelText("status: degraded")).toBeInTheDocument();
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

	it("ok source has a HealthDot with ok aria-label", () => {
		renderFooter({ sourceStatus: { internal: "ok" } });
		expect(screen.getByLabelText("status: ok")).toBeInTheDocument();
	});

	it("degraded source has a HealthDot with degraded aria-label", () => {
		renderFooter({ sourceStatus: { asset: "degraded" } });
		expect(screen.getByLabelText("status: degraded")).toBeInTheDocument();
	});

	it("error source has a HealthDot with error aria-label", () => {
		renderFooter({ sourceStatus: { sensor: "error" } });
		expect(screen.getByLabelText("status: error")).toBeInTheDocument();
	});
});
