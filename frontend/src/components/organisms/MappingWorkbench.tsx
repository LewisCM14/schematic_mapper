import { Box, Button, Tab, Tabs, TextField, Typography } from "@mui/material";
import type { CanvasMarker } from "./DiagramCanvasViewport";
import DiagramCanvasViewport from "./DiagramCanvasViewport";

interface MappedPos {
	id: string;
	x: number;
	y: number;
	label: string;
}

interface MappingWorkbenchProps {
	imageSvgUrl: string;
	mappedPositions: MappedPos[];
	pendingPos: { x: number; y: number } | null;
	editingLabel: string;
	mappingTab: number;
	onMappingTabChange: (tab: number) => void;
	onCanvasClick: (x: number, y: number) => void;
	onMarkerDrag: (id: string, x: number, y: number) => void;
	onEditingLabelChange: (value: string) => void;
	onConfirmMarker: () => void;
	onCancelMarker: () => void;
}

function MappingWorkbench({
	imageSvgUrl,
	mappedPositions,
	pendingPos,
	editingLabel,
	mappingTab,
	onMappingTabChange,
	onCanvasClick,
	onMarkerDrag,
	onEditingLabelChange,
	onConfirmMarker,
	onCancelMarker,
}: MappingWorkbenchProps) {
	const markers: CanvasMarker[] = mappedPositions.map((p) => ({
		id: p.id,
		x: p.x,
		y: p.y,
		status: "unmapped" as const,
	}));

	return (
		<Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
			{/* LHS tabs for Unmapped / Mapped */}
			<Box
				sx={{
					width: 260,
					flexShrink: 0,
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
				<Box sx={{ p: 1.5, maxHeight: 400, overflow: "auto" }}>
					{mappingTab === 0 &&
						(pendingPos ? (
							<Box
								sx={{
									display: "flex",
									flexDirection: "column",
									gap: 1,
								}}
							>
								<Typography variant="body2">
									New marker at ({pendingPos.x}, {pendingPos.y})
								</Typography>
								<TextField
									label="Label (fitting position ID)"
									size="small"
									value={editingLabel}
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
										disabled={!editingLabel.trim()}
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
									? "Click the canvas to place the first marker."
									: "Click the canvas to add another marker."}
							</Typography>
						))}
					{mappingTab === 1 &&
						(mappedPositions.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								No markers placed yet.
							</Typography>
						) : (
							mappedPositions.map((p) => (
								<Typography
									key={p.id}
									variant="caption"
									display="block"
									sx={{ py: 0.5 }}
								>
									{p.label} — ({p.x}, {p.y})
								</Typography>
							))
						))}
				</Box>
			</Box>

			{/* Canvas area */}
			<Box sx={{ flexGrow: 1, minWidth: 400 }}>
				<DiagramCanvasViewport
					imageSvgUrl={imageSvgUrl}
					markers={markers}
					onCanvasClick={onCanvasClick}
					onMarkerDrag={onMarkerDrag}
				/>
			</Box>
		</Box>
	);
}

export default MappingWorkbench;
