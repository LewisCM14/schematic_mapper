import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import MappingWorkbench from "./MappingWorkbench";

function renderWorkbench() {
	return render(
		<ThemeProvider theme={theme}>
			<MappingWorkbench
				imageSvgUrl="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E"
				mappedPositions={[]}
				pendingPos={null}
				editingLabel=""
				mappingTab={0}
				onMappingTabChange={vi.fn()}
				onCanvasClick={vi.fn()}
				onMarkerDrag={vi.fn()}
				onEditingLabelChange={vi.fn()}
				onConfirmMarker={vi.fn()}
				onCancelMarker={vi.fn()}
			/>
		</ThemeProvider>,
	);
}

describe("MappingWorkbench", () => {
	it("renders Unmapped and Mapped tabs", () => {
		renderWorkbench();
		expect(
			screen.getByRole("tab", { name: "unmapped tab" }),
		).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: "mapped tab" })).toBeInTheDocument();
	});

	it("renders the diagram canvas", () => {
		renderWorkbench();
		expect(screen.getByTestId("diagram-canvas")).toBeInTheDocument();
	});
});
