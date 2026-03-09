import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import TopAppHeader from "./TopAppHeader";

function renderHeader(props: Partial<Parameters<typeof TopAppHeader>[0]> = {}) {
	const defaults: Parameters<typeof TopAppHeader>[0] = {
		title: "Schematic Mapper",
		...props,
	};
	return render(
		<ThemeProvider theme={theme}>
			<TopAppHeader {...defaults} />
		</ThemeProvider>,
	);
}

describe("TopAppHeader", () => {
	it("renders the application title", () => {
		renderHeader();
		expect(screen.getByText("Schematic Mapper")).toBeInTheDocument();
	});

	it("renders contextLabel when provided", () => {
		renderHeader({ contextLabel: "Pump Assembly — Rev 3" });
		expect(screen.getByText("Pump Assembly — Rev 3")).toBeInTheDocument();
	});

	it("renders StatusChip atoms for each entry in sourceStatus", () => {
		renderHeader({
			sourceStatus: { internal: "ok", asset: "degraded" },
		});
		expect(screen.getByLabelText("internal ok")).toBeInTheDocument();
		expect(screen.getByLabelText("asset degraded")).toBeInTheDocument();
	});

	it("does not render status chips when sourceStatus is omitted", () => {
		renderHeader();
		expect(screen.queryByLabelText(/ok|degraded|error/)).toBeNull();
	});
});
