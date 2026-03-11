import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import MappingWorkbench from "./MappingWorkbench";

function renderWorkbench() {
	return render(
		<ThemeProvider theme={theme}>
			<MappingWorkbench
				imageSvgUrl="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E"
				mappedPositions={[]}
				pendingRect={null}
				editingLabel=""
				labelErrorText={null}
				mappingTab={0}
				selectedMappedPositionId={null}
				deleteCandidateId={null}
				deleteInProgress={false}
				onMappingTabChange={vi.fn()}
				onRectangleDraw={vi.fn()}
				onEditingLabelChange={vi.fn()}
				onConfirmMarker={vi.fn()}
				onCancelMarker={vi.fn()}
				onMappedPositionSelect={vi.fn()}
				onRequestDeleteMappedPosition={vi.fn()}
				onConfirmDeleteMappedPosition={vi.fn()}
				onCancelDeleteMappedPosition={vi.fn()}
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

	it("renders a dedicated scroll container for mapping details", () => {
		renderWorkbench();
		expect(screen.getByTestId("mapping-sidebar-scroll")).toBeInTheDocument();
	});

	it("renders confirmed markers as mapped", () => {
		render(
			<ThemeProvider theme={theme}>
				<MappingWorkbench
					imageSvgUrl="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E"
					mappedPositions={[
						{ id: "FP-001", x: 50, y: 50, width: 20, height: 10, label: "FP-001" },
					]}
					pendingRect={null}
					editingLabel=""
					labelErrorText={null}
					mappingTab={0}
					selectedMappedPositionId={null}
					deleteCandidateId={null}
					deleteInProgress={false}
					onMappingTabChange={vi.fn()}
					onRectangleDraw={vi.fn()}
					onEditingLabelChange={vi.fn()}
					onConfirmMarker={vi.fn()}
					onCancelMarker={vi.fn()}
					onMappedPositionSelect={vi.fn()}
					onRequestDeleteMappedPosition={vi.fn()}
					onConfirmDeleteMappedPosition={vi.fn()}
					onCancelDeleteMappedPosition={vi.fn()}
				/>
			</ThemeProvider>,
		);
		expect(screen.getByLabelText("rectangle FP-001")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "FP-001" }),
		).not.toBeInTheDocument();
	});

	it("renders pending rectangle as unmapped", () => {
		render(
			<ThemeProvider theme={theme}>
				<MappingWorkbench
					imageSvgUrl="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E"
					mappedPositions={[]}
					pendingRect={{ x: 100, y: 200, width: 30, height: 40 }}
					editingLabel=""
					labelErrorText={null}
					mappingTab={0}
					selectedMappedPositionId={null}
					deleteCandidateId={null}
					deleteInProgress={false}
					onMappingTabChange={vi.fn()}
					onRectangleDraw={vi.fn()}
					onEditingLabelChange={vi.fn()}
					onConfirmMarker={vi.fn()}
					onCancelMarker={vi.fn()}
					onMappedPositionSelect={vi.fn()}
					onRequestDeleteMappedPosition={vi.fn()}
					onConfirmDeleteMappedPosition={vi.fn()}
					onCancelDeleteMappedPosition={vi.fn()}
				/>
			</ThemeProvider>,
		);
		expect(screen.getByLabelText("rectangle __pending__")).toBeInTheDocument();
		expect(screen.getByText(/Size: 30 × 40 px/)).toBeInTheDocument();
	});

	it("renders an interaction mode toggle and defaults to draw mode", () => {
		renderWorkbench();
		expect(screen.getByRole("group", { name: "mapping interaction mode" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "draw box mode" })).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("button", { name: "pan and zoom mode" })).toHaveAttribute("aria-pressed", "false");
	});

	it("shows label validation feedback for duplicate mappings", () => {
		render(
			<ThemeProvider theme={theme}>
				<MappingWorkbench
					imageSvgUrl="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E"
					mappedPositions={[]}
					pendingRect={{ x: 100, y: 200, width: 30, height: 40 }}
					editingLabel="FP-001"
					labelErrorText="Label text must be unique per image."
					mappingTab={0}
					selectedMappedPositionId={null}
					deleteCandidateId={null}
					deleteInProgress={false}
					onMappingTabChange={vi.fn()}
					onRectangleDraw={vi.fn()}
					onEditingLabelChange={vi.fn()}
					onConfirmMarker={vi.fn()}
					onCancelMarker={vi.fn()}
					onMappedPositionSelect={vi.fn()}
					onRequestDeleteMappedPosition={vi.fn()}
					onConfirmDeleteMappedPosition={vi.fn()}
					onCancelDeleteMappedPosition={vi.fn()}
				/>
			</ThemeProvider>,
		);

		expect(screen.getByText("Label text must be unique per image.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /confirm/i })).toBeDisabled();
	});

	it("allows switching between pan and draw modes", async () => {
		renderWorkbench();

		await userEvent.click(screen.getByRole("button", { name: "pan and zoom mode" }));
		expect(screen.getByRole("button", { name: "pan and zoom mode" })).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("button", { name: "draw box mode" })).toHaveAttribute("aria-pressed", "false");

		await userEvent.click(screen.getByRole("button", { name: "draw box mode" }));
		expect(screen.getByRole("button", { name: "draw box mode" })).toHaveAttribute("aria-pressed", "true");
	});

	it("supports selecting a mapped position and showing delete confirmation", async () => {
		const onMappedPositionSelect = vi.fn();
		const onRequestDeleteMappedPosition = vi.fn();
		const onConfirmDeleteMappedPosition = vi.fn();
		const onCancelDeleteMappedPosition = vi.fn();

		const { rerender } = render(
			<ThemeProvider theme={theme}>
				<MappingWorkbench
					imageSvgUrl="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E"
					mappedPositions={[
						{
							id: "FP-001",
							x: 50,
							y: 75,
							width: 0,
							height: 0,
							label: "FP-001",
							persisted: true,
						},
					]}
					pendingRect={null}
					editingLabel=""
					labelErrorText={null}
					mappingTab={1}
					selectedMappedPositionId={null}
					deleteCandidateId={null}
					deleteInProgress={false}
					onMappingTabChange={vi.fn()}
					onRectangleDraw={vi.fn()}
					onEditingLabelChange={vi.fn()}
					onConfirmMarker={vi.fn()}
					onCancelMarker={vi.fn()}
					onMappedPositionSelect={onMappedPositionSelect}
					onRequestDeleteMappedPosition={onRequestDeleteMappedPosition}
					onConfirmDeleteMappedPosition={onConfirmDeleteMappedPosition}
					onCancelDeleteMappedPosition={onCancelDeleteMappedPosition}
				/>
			</ThemeProvider>,
		);

		await userEvent.click(screen.getByText("FP-001"));
		expect(onMappedPositionSelect).toHaveBeenCalledWith("FP-001");

		rerender(
			<ThemeProvider theme={theme}>
				<MappingWorkbench
					imageSvgUrl="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E"
					mappedPositions={[
						{
							id: "FP-001",
							x: 50,
							y: 75,
							width: 0,
							height: 0,
							label: "FP-001",
							persisted: true,
						},
					]}
					pendingRect={null}
					editingLabel=""
					labelErrorText={null}
					mappingTab={1}
					selectedMappedPositionId="FP-001"
					deleteCandidateId={null}
					deleteInProgress={false}
					onMappingTabChange={vi.fn()}
					onRectangleDraw={vi.fn()}
					onEditingLabelChange={vi.fn()}
					onConfirmMarker={vi.fn()}
					onCancelMarker={vi.fn()}
					onMappedPositionSelect={onMappedPositionSelect}
					onRequestDeleteMappedPosition={onRequestDeleteMappedPosition}
					onConfirmDeleteMappedPosition={onConfirmDeleteMappedPosition}
					onCancelDeleteMappedPosition={onCancelDeleteMappedPosition}
				/>
			</ThemeProvider>,
		);

		await userEvent.click(screen.getByRole("button", { name: /delete/i }));
		expect(onRequestDeleteMappedPosition).toHaveBeenCalledWith("FP-001");

		rerender(
			<ThemeProvider theme={theme}>
				<MappingWorkbench
					imageSvgUrl="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E"
					mappedPositions={[
						{
							id: "FP-001",
							x: 50,
							y: 75,
							width: 0,
							height: 0,
							label: "FP-001",
							persisted: true,
						},
					]}
					pendingRect={null}
					editingLabel=""
					labelErrorText={null}
					mappingTab={1}
					selectedMappedPositionId="FP-001"
					deleteCandidateId="FP-001"
					deleteInProgress={false}
					onMappingTabChange={vi.fn()}
					onRectangleDraw={vi.fn()}
					onEditingLabelChange={vi.fn()}
					onConfirmMarker={vi.fn()}
					onCancelMarker={vi.fn()}
					onMappedPositionSelect={onMappedPositionSelect}
					onRequestDeleteMappedPosition={onRequestDeleteMappedPosition}
					onConfirmDeleteMappedPosition={onConfirmDeleteMappedPosition}
					onCancelDeleteMappedPosition={onCancelDeleteMappedPosition}
				/>
			</ThemeProvider>,
		);

		expect(
			screen.getByText(/are you sure you want to delete this mapping/i),
		).toBeInTheDocument();
		await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
		expect(onConfirmDeleteMappedPosition).toHaveBeenCalledWith("FP-001");
		await userEvent.click(screen.getByRole("button", { name: /keep/i }));
		expect(onCancelDeleteMappedPosition).toHaveBeenCalled();
	});

	it("renders the selected mapped label in a distinct colour", () => {
		render(
			<ThemeProvider theme={theme}>
				<MappingWorkbench
					imageSvgUrl="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E"
					mappedPositions={[
						{
							id: "FP-001",
							x: 50,
							y: 75,
							width: 0,
							height: 0,
							label: "FP-001",
							persisted: true,
						},
					]}
					pendingRect={null}
					editingLabel=""
					labelErrorText={null}
					mappingTab={1}
					selectedMappedPositionId="FP-001"
					deleteCandidateId={null}
					deleteInProgress={false}
					onMappingTabChange={vi.fn()}
					onRectangleDraw={vi.fn()}
					onEditingLabelChange={vi.fn()}
					onConfirmMarker={vi.fn()}
					onCancelMarker={vi.fn()}
					onMappedPositionSelect={vi.fn()}
					onRequestDeleteMappedPosition={vi.fn()}
					onConfirmDeleteMappedPosition={vi.fn()}
					onCancelDeleteMappedPosition={vi.fn()}
				/>
			</ThemeProvider>,
		);

		expect(screen.getByTestId("mapped-label-FP-001")).toHaveStyle({
			color: theme.palette.primary.main,
			fontWeight: "700",
		});
	});

	it("renders the selected mapped rectangle in a distinct colour on the canvas", () => {
		render(
			<ThemeProvider theme={theme}>
				<MappingWorkbench
					imageSvgUrl="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E"
					mappedPositions={[
						{
							id: "FP-001",
							x: 50,
							y: 50,
							width: 20,
							height: 10,
							label: "FP-001",
							persisted: true,
						},
					]}
					pendingRect={null}
					editingLabel=""
					labelErrorText={null}
					mappingTab={1}
					selectedMappedPositionId="FP-001"
					deleteCandidateId={null}
					deleteInProgress={false}
					onMappingTabChange={vi.fn()}
					onRectangleDraw={vi.fn()}
					onEditingLabelChange={vi.fn()}
					onConfirmMarker={vi.fn()}
					onCancelMarker={vi.fn()}
					onMappedPositionSelect={vi.fn()}
					onRequestDeleteMappedPosition={vi.fn()}
					onConfirmDeleteMappedPosition={vi.fn()}
					onCancelDeleteMappedPosition={vi.fn()}
				/>
			</ThemeProvider>,
		);

		expect(screen.getByTestId("rectangle-FP-001")).toHaveStyle({
			borderColor: theme.palette.map.poi.selected,
		});
	});
});
