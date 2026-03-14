/**
 * MappingWorkbench.tsx
 *
 * Provides a workbench UI for mapping fitting positions on a schematic image.
 *
 * - Allows users to draw, label, and manage mapped positions (rectangles and markers).
 * - Supports tabbed navigation for unmapped/mapped positions, label editing, and deletion.
 * - Integrates with DiagramCanvasViewport for interactive canvas operations.
 * - Used in admin workflows for creating and editing fitting position mappings.
 */
import {
	Box,
	Button,
	Chip,
	Tab,
	Tabs,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from "@mui/material";
import { useState } from "react";
import type { CanvasMarker, CanvasRectangle } from "./DiagramCanvasViewport";
import DiagramCanvasViewport from "./DiagramCanvasViewport";

interface MappedPos {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	label: string;
	persisted?: boolean;
}

interface MappingWorkbenchProps {
	imageSvgUrl: string;
	mappedPositions: MappedPos[];
	pendingRect: { x: number; y: number; width: number; height: number } | null;
	editingLabel: string;
	labelErrorText?: string | null;
	mappingTab: number;
	selectedMappedPositionId?: string | null;
	deleteCandidateId?: string | null;
	deleteInProgress?: boolean;
	onMappingTabChange: (tab: number) => void;
	onRectangleDraw: (rectangle: {
		x: number;
		y: number;
		width: number;
		height: number;
	}) => void;
	onEditingLabelChange: (value: string) => void;
	onConfirmMarker: () => void;
	onCancelMarker: () => void;
	onMappedPositionSelect: (id: string) => void;
	onRequestDeleteMappedPosition: (id: string) => void;
	onConfirmDeleteMappedPosition: (id: string) => void;
	onCancelDeleteMappedPosition: () => void;
}

/**
 * Renders the mapping workbench for fitting position selection and management.
 * Handles drawing, labeling, selecting, and deleting mapped positions.
 *
 * @param imageSvgUrl URL of the schematic SVG image
 * @param mappedPositions Array of mapped positions (rectangles and markers)
 * @param pendingRect Rectangle currently being drawn (optional)
 * @param editingLabel Current label input for a new mapping
 * @param labelErrorText Error text for the label input (optional)
 * @param mappingTab Index of the active tab (0: Unmapped, 1: Mapped)
 * @param selectedMappedPositionId ID of the selected mapped position (optional)
 * @param deleteCandidateId ID of the position pending deletion confirmation (optional)
 * @param deleteInProgress Whether a delete operation is in progress (optional)
 * @param onMappingTabChange Handler for tab changes
 * @param onRectangleDraw Handler for completing a rectangle draw
 * @param onEditingLabelChange Handler for label input changes
 * @param onConfirmMarker Handler for confirming a new marker
 * @param onCancelMarker Handler for canceling a new marker
 * @param onMappedPositionSelect Handler for selecting a mapped position
 * @param onRequestDeleteMappedPosition Handler for requesting deletion
 * @param onConfirmDeleteMappedPosition Handler for confirming deletion
 * @param onCancelDeleteMappedPosition Handler for canceling deletion
 */
function MappingWorkbench({
	imageSvgUrl,
	mappedPositions,
	pendingRect,
	editingLabel,
	labelErrorText = null,
	mappingTab,
	selectedMappedPositionId = null,
	deleteCandidateId = null,
	deleteInProgress = false,
	onMappingTabChange,
	onRectangleDraw,
	onEditingLabelChange,
	onConfirmMarker,
	onCancelMarker,
	onMappedPositionSelect,
	onRequestDeleteMappedPosition,
	onConfirmDeleteMappedPosition,
	onCancelDeleteMappedPosition,
}: MappingWorkbenchProps) {
	const [interactionMode, setInteractionMode] = useState<"pan" | "draw">(
		"draw",
	);
	const workbenchHeight = "70vh";
	const rectangles: CanvasRectangle[] = mappedPositions
		.filter((p) => p.width > 0 && p.height > 0)
		.map((p) => ({
			id: p.id,
			x: p.x,
			y: p.y,
			width: p.width,
			height: p.height,
			status: "mapped" as const,
		}));
	const markers: CanvasMarker[] = mappedPositions
		.filter((p) => p.width === 0 || p.height === 0)
		.map((p) => ({
			id: p.id,
			x: p.width > 0 ? p.x + p.width / 2 : p.x,
			y: p.height > 0 ? p.y + p.height / 2 : p.y,
			status: "mapped" as const,
		}));
	const selectedMappedPosition = mappedPositions.find(
		(position) => position.id === selectedMappedPositionId,
	);
	const panToTarget = selectedMappedPosition
		? {
				x:
					selectedMappedPosition.width > 0
						? selectedMappedPosition.x + selectedMappedPosition.width / 2
						: selectedMappedPosition.x,
				y:
					selectedMappedPosition.height > 0
						? selectedMappedPosition.y + selectedMappedPosition.height / 2
						: selectedMappedPosition.y,
			}
		: null;

	return (
		<Box
			sx={{
				display: "flex",
				gap: 3,
				alignItems: "stretch",
				flexDirection: { xs: "column", lg: "row" },
			}}
		>
			{/* LHS tabs for Unmapped / Mapped */}
			<Box
				sx={{
					width: { xs: "100%", lg: 280 },
					flexShrink: 0,
					display: "flex",
					flexDirection: "column",
					height: { xs: "auto", lg: workbenchHeight },
					border: "1px solid",
					borderColor: "divider",
					borderRadius: 1,
					overflow: "hidden",
				}}
			>
				<Tabs
					value={mappingTab}
					onChange={(_e, v: number) => onMappingTabChange(v)}
					variant="fullWidth"
				>
					<Tab label="Unmapped" aria-label="unmapped tab" />
					<Tab label="Mapped" aria-label="mapped tab" />
				</Tabs>
				<Box
					data-testid="mapping-sidebar-scroll"
					sx={{
						p: 1.5,
						flex: 1,
						minHeight: 0,
						overflow: "auto",
					}}
				>
					{mappingTab === 0 &&
						(pendingRect ? (
							<Box
								sx={{
									display: "flex",
									flexDirection: "column",
									gap: 1,
								}}
							>
								<Typography variant="body2">
									New selection box at ({pendingRect.x}, {pendingRect.y})
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Size: {pendingRect.width} × {pendingRect.height} px
								</Typography>
								<TextField
									label="Label (fitting position ID)"
									size="small"
									value={editingLabel}
									error={Boolean(labelErrorText)}
									helperText={labelErrorText || undefined}
									onChange={(e) => onEditingLabelChange(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") onConfirmMarker();
										if (e.key === "Escape") onCancelMarker();
									}}
									autoFocus
									inputProps={{ "aria-label": "marker label" }}
								/>
								<Box sx={{ display: "flex", gap: 1 }}>
									<Button
										variant="contained"
										size="small"
										onClick={onConfirmMarker}
										disabled={!editingLabel.trim() || Boolean(labelErrorText)}
									>
										Confirm
									</Button>
									<Button size="small" onClick={onCancelMarker}>
										Cancel
									</Button>
								</Box>
							</Box>
						) : (
							<Typography variant="body2" color="text.secondary">
								{mappedPositions.length === 0
									? "Drag on the canvas to draw the first selection box."
									: "Drag on the canvas to add another selection box."}
							</Typography>
						))}
					{mappingTab === 1 &&
						(mappedPositions.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								No markers placed yet.
							</Typography>
						) : (
							<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
								{mappedPositions.map((p) => {
									const isSelected = p.id === selectedMappedPositionId;
									const isConfirmingDelete = p.id === deleteCandidateId;
									const centerX = p.width > 0 ? p.x + p.width / 2 : p.x;
									const centerY = p.height > 0 ? p.y + p.height / 2 : p.y;

									return (
										<Box
											key={p.id}
											onClick={() => onMappedPositionSelect(p.id)}
											sx={{
												border: "1px solid",
												borderColor: isSelected ? "primary.main" : "divider",
												borderRadius: 1,
												p: 1,
												cursor: "pointer",
												bgcolor: isSelected ? "action.selected" : "transparent",
											}}
										>
											<Box
												sx={{
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
													gap: 1,
												}}
											>
												<Typography
													variant="body2"
													data-testid={`mapped-label-${p.id}`}
													sx={{
														color: isSelected ? "primary.main" : "text.primary",
														fontWeight: isSelected ? 700 : 400,
													}}
												>
													{p.label}
												</Typography>
												<Chip
													label={p.persisted ? "Saved" : "New"}
													size="small"
													color={p.persisted ? "default" : "primary"}
													variant={p.persisted ? "outlined" : "filled"}
												/>
											</Box>
											<Typography variant="caption" color="text.secondary">
												{p.width > 0 && p.height > 0
													? `${p.width} × ${p.height} px at (${p.x}, ${p.y})`
													: `Center at (${Math.round(centerX)}, ${Math.round(centerY)})`}
											</Typography>
											{isSelected && !isConfirmingDelete && (
												<Box sx={{ display: "flex", gap: 1, mt: 1 }}>
													<Button
														size="small"
														color="error"
														onClick={(event) => {
															event.stopPropagation();
															onRequestDeleteMappedPosition(p.id);
														}}
													>
														{p.persisted ? "Delete" : "Remove"}
													</Button>
												</Box>
											)}
											{isConfirmingDelete && (
												<Box
													sx={{
														mt: 1,
														display: "flex",
														flexDirection: "column",
														gap: 1,
													}}
												>
													<Typography variant="caption" color="text.secondary">
														Are you sure you want to{" "}
														{p.persisted ? "delete" : "remove"} this mapping?
													</Typography>
													<Box sx={{ display: "flex", gap: 1 }}>
														<Button
															size="small"
															variant="contained"
															color="error"
															disabled={deleteInProgress}
															onClick={(event) => {
																event.stopPropagation();
																onConfirmDeleteMappedPosition(p.id);
															}}
														>
															{p.persisted ? "Delete" : "Remove"}
														</Button>
														<Button
															size="small"
															onClick={(event) => {
																event.stopPropagation();
																onCancelDeleteMappedPosition();
															}}
														>
															Keep
														</Button>
													</Box>
												</Box>
											)}
										</Box>
									);
								})}
							</Box>
						))}
				</Box>
			</Box>

			{/* Canvas area */}
			<Box sx={{ flexGrow: 1, minWidth: 0 }}>
				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: { xs: "flex-start", sm: "center" },
						gap: 1.5,
						mb: 1.5,
						flexWrap: "wrap",
					}}
				>
					<Box>
						<Typography variant="subtitle2">Interaction Mode</Typography>
						<Typography variant="caption" color="text.secondary">
							Switch to Pan &amp; Zoom to reposition the drawing, then return to
							Draw Box to mark a fitting position.
						</Typography>
					</Box>
					<ToggleButtonGroup
						value={interactionMode}
						exclusive
						onChange={(_event, nextMode: "pan" | "draw" | null) => {
							if (nextMode) {
								setInteractionMode(nextMode);
							}
						}}
						size="small"
						aria-label="mapping interaction mode"
					>
						<ToggleButton value="pan" aria-label="pan and zoom mode">
							Pan &amp; Zoom
						</ToggleButton>
						<ToggleButton value="draw" aria-label="draw box mode">
							Draw Box
						</ToggleButton>
					</ToggleButtonGroup>
				</Box>
				<DiagramCanvasViewport
					imageSvgUrl={imageSvgUrl}
					markers={markers}
					interactionMode={interactionMode}
					rectangles={rectangles}
					panToTarget={panToTarget}
					selectedMarkerId={selectedMappedPositionId}
					onMarkerClick={onMappedPositionSelect}
					draftRectangle={
						pendingRect
							? {
									id: "__pending__",
									x: pendingRect.x,
									y: pendingRect.y,
									width: pendingRect.width,
									height: pendingRect.height,
									status: "unmapped",
								}
							: null
					}
					onRectangleDraw={onRectangleDraw}
				/>
			</Box>
		</Box>
	);
}

export default MappingWorkbench;
