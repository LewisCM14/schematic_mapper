import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Grid,
	MenuItem,
	Paper,
	Select,
	Tooltip,
	Typography,
} from "@mui/material";
import { useState } from "react";
import ImageTileCard from "../components/molecules/ImageTileCard";
import ValidationSummaryRow from "../components/molecules/ValidationSummaryRow";
import MappingWorkbench from "../components/organisms/MappingWorkbench";
import UploadSessionPanel from "../components/organisms/UploadSessionPanel";
import AdminMappingTemplate from "../components/templates/AdminMappingTemplate";
import type { BulkFittingPositionItem } from "../services/api/endpoints";
import { useSaveBulkFittingPositions } from "../services/api/hooks/useAdminUpload";
import { useChunkedUpload } from "../services/api/hooks/useChunkedUpload";
import { useDrawingTypes } from "../services/api/hooks/useDrawingTypes";
import { useImage, useImages } from "../services/api/hooks/useImages";

const STEPS = [
	"Select Type",
	"Upload Image",
	"Select Image",
	"Map Positions",
	"Save",
];

interface MappedPos {
	id: string;
	x: number;
	y: number;
	label: string;
}

function AdminUploadMappingPage() {
	const [showDisclaimer, setShowDisclaimer] = useState(true);
	const [activeStep, setActiveStep] = useState(0);

	// Step 1
	const [selectedDrawingTypeId, setSelectedDrawingTypeId] = useState<
		number | ""
	>("");
	const {
		data: drawingTypes = [],
		isLoading: drawingTypesLoading,
		isError: drawingTypesError,
	} = useDrawingTypes();

	// Step 2 — upload
	const [componentName, setComponentName] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [idempotencyKey] = useState(() => crypto.randomUUID());
	const [upload, uploadActions] = useChunkedUpload();

	// Step 3 — select uploaded image
	const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
	const { data: selectableImagesData, isLoading: selectableImagesLoading } =
		useImages(
			typeof selectedDrawingTypeId === "number"
				? selectedDrawingTypeId
				: undefined,
		);

	// Step 4 — mapping
	const [mappedPositions, setMappedPositions] = useState<MappedPos[]>([]);
	const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(
		null,
	);
	const [editingLabel, setEditingLabel] = useState("");
	const [mappingTab, setMappingTab] = useState(0); // 0 = Unmapped, 1 = Mapped
	const { data: selectedImage } = useImage(selectedImageId ?? "");

	// Step 5 — save
	const saveBulk = useSaveBulkFittingPositions();
	const [saveResult, setSaveResult] = useState<{
		created: number;
		updated: number;
	} | null>(null);

	// ── Handlers ─────────────────────────────────────────────────────────────

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const picked = e.target.files?.[0] ?? null;
		setFile(picked);
	}

	async function handleUpload() {
		if (
			!file ||
			!selectedDrawingTypeId ||
			typeof selectedDrawingTypeId !== "number"
		)
			return;

		await uploadActions.start({
			drawingTypeId: selectedDrawingTypeId,
			componentName,
			file,
			idempotencyKey,
		});

		// Advance to step 3 only on success (completedImageId set by hook)
		// The effect is handled via upload.completedImageId below
	}

	async function handleAbort() {
		await uploadActions.abort();
		setFile(null);
	}

	function confirmMarker() {
		if (!pendingPos || !editingLabel.trim()) return;
		setMappedPositions((prev) => [
			...prev,
			{
				id: `FP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
				x: pendingPos.x,
				y: pendingPos.y,
				label: editingLabel.trim(),
			},
		]);
		setPendingPos(null);
		setEditingLabel("");
	}

	async function handleSave() {
		if (!selectedImageId) return;
		const items: BulkFittingPositionItem[] = mappedPositions.map((p) => ({
			fitting_position_id: p.id,
			label_text: p.label,
			x_coordinate: p.x,
			y_coordinate: p.y,
		}));
		const result = await saveBulk.mutateAsync({
			imageId: selectedImageId,
			fittingPositions: items,
		});
		setSaveResult(result);
		setActiveStep(4);
	}

	// Auto-advance to Step 3 when upload completes
	if (upload.completedImageId && activeStep === 1) {
		setSelectedImageId(upload.completedImageId);
		setActiveStep(2);
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<AdminMappingTemplate
			title="Admin Panel"
			steps={STEPS}
			activeStep={activeStep}
			showDisclaimer={showDisclaimer}
			onDismissDisclaimer={() => setShowDisclaimer(false)}
		>
			{/* ── Step 1: Select drawing type ── */}
			{activeStep === 0 && (
				<Paper sx={{ p: 3 }}>
					<Typography variant="h6" gutterBottom>
						Select Drawing Type
					</Typography>
					{drawingTypesLoading && (
						<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
							<CircularProgress size={24} aria-label="loading drawing types" />
						</Box>
					)}
					{drawingTypesError && (
						<Alert severity="error" sx={{ mb: 2 }}>
							Failed to load drawing types.
						</Alert>
					)}
					{!drawingTypesLoading &&
						!drawingTypesError &&
						drawingTypes.length === 0 && (
							<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								No drawing types available.
							</Typography>
						)}
					{!drawingTypesLoading &&
						!drawingTypesError &&
						drawingTypes.length > 0 && (
							<Select
								fullWidth
								displayEmpty
								value={selectedDrawingTypeId}
								onChange={(e) =>
									setSelectedDrawingTypeId(e.target.value as number | "")
								}
								size="small"
								inputProps={{ "aria-label": "drawing type" }}
							>
								<MenuItem value="" disabled>
									— select drawing type —
								</MenuItem>
								{drawingTypes.map((dt) => (
									<MenuItem key={dt.drawing_type_id} value={dt.drawing_type_id}>
										{dt.type_name}
									</MenuItem>
								))}
							</Select>
						)}
					<Box sx={{ mt: 2 }}>
						<Button
							variant="contained"
							disabled={!selectedDrawingTypeId}
							onClick={() => setActiveStep(1)}
						>
							Next
						</Button>
					</Box>
				</Paper>
			)}

			{/* ── Step 2: Upload ── */}
			{activeStep === 1 && (
				<Paper sx={{ p: 3 }}>
					<Typography variant="h6" gutterBottom>
						Upload Image
					</Typography>
					<UploadSessionPanel
						componentName={componentName}
						onComponentNameChange={setComponentName}
						fileName={file ? file.name : null}
						onFileChange={handleFileChange}
						uploadProgress={upload.progress}
						uploadError={upload.error}
						isUploading={upload.isUploading}
						showAbort={upload.showAbort}
						onUpload={handleUpload}
						onAbort={handleAbort}
						onBack={() => setActiveStep(0)}
						uploadDisabled={
							!file || !componentName.trim() || upload.isUploading
						}
						abortDisabled={false}
					/>
				</Paper>
			)}

			{/* ── Step 3: Select image ── */}
			{activeStep === 2 && (
				<Paper sx={{ p: 3 }}>
					{upload.completedImageId && (
						<Alert severity="success" sx={{ mb: 2 }}>
							Upload complete — select an image to map.
						</Alert>
					)}
					<Typography variant="h6" gutterBottom>
						Select Image
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Choose an image from the available schematics for this drawing type.
					</Typography>

					{selectableImagesLoading && (
						<Box
							sx={{ display: "flex", justifyContent: "center", mt: 4, mb: 2 }}
						>
							<CircularProgress size={28} />
						</Box>
					)}

					{(() => {
						const selectableImages =
							selectableImagesData?.pages.flatMap((p) => p.results) ?? [];
						if (!selectableImagesLoading && selectableImages.length === 0) {
							return (
								<Typography color="text.secondary">
									No images available for this drawing type.
								</Typography>
							);
						}
						return (
							<Grid container spacing={2}>
								{selectableImages.map((img) => (
									<Grid key={img.image_id} size={{ xs: 12, sm: 6, md: 4 }}>
										<ImageTileCard
											image={img}
											onClick={(imageId) => {
												setSelectedImageId(imageId);
												setActiveStep(3);
											}}
										/>
									</Grid>
								))}
							</Grid>
						);
					})()}

					<Box sx={{ mt: 2 }}>
						<Button variant="outlined" onClick={() => setActiveStep(1)}>
							Back
						</Button>
					</Box>
				</Paper>
			)}

			{/* ── Step 4: Map positions ── */}
			{activeStep === 3 && (
				<Paper sx={{ p: 3 }}>
					<Typography variant="h6" gutterBottom>
						Map Fitting Positions
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Click anywhere on the canvas to place a marker, then enter its
						label.
					</Typography>

					{selectedImage ? (
						<MappingWorkbench
							imageSvgUrl={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(selectedImage.image_svg)}`}
							mappedPositions={mappedPositions}
							pendingPos={pendingPos}
							editingLabel={editingLabel}
							mappingTab={mappingTab}
							onMappingTabChange={setMappingTab}
							onCanvasClick={(x, y) => {
								setPendingPos({ x, y });
								setEditingLabel("");
								setMappingTab(0);
							}}
							onMarkerDrag={(id, x, y) => {
								setMappedPositions((prev) =>
									prev.map((p) => (p.id === id ? { ...p, x, y } : p)),
								);
							}}
							onEditingLabelChange={setEditingLabel}
							onConfirmMarker={confirmMarker}
							onCancelMarker={() => {
								setPendingPos(null);
								setEditingLabel("");
							}}
						/>
					) : (
						<Box
							sx={{
								minWidth: 400,
								height: 400,
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								border: "1px dashed",
								borderColor: "divider",
								borderRadius: 1,
								bgcolor: "grey.50",
							}}
							role="button"
							aria-label="mapping canvas"
						>
							<CircularProgress size={28} />
						</Box>
					)}

					<Box sx={{ mt: 2, display: "flex", gap: 1 }}>
						<Button variant="outlined" onClick={() => setActiveStep(2)}>
							Back
						</Button>
						<Button
							variant="contained"
							disabled={mappedPositions.length === 0}
							onClick={() => setActiveStep(4)}
						>
							Review &amp; Save
						</Button>
					</Box>
				</Paper>
			)}

			{/* ── Step 5: Save ── */}
			{activeStep === 4 && (
				<Paper sx={{ p: 3 }}>
					<Typography variant="h6" gutterBottom>
						Validate &amp; Save
					</Typography>

					{saveResult ? (
						<Alert severity="success">
							Saved — {saveResult.created} created, {saveResult.updated}{" "}
							updated.
						</Alert>
					) : (
						<>
							<Typography variant="body2" sx={{ mb: 2 }}>
								{mappedPositions.length} fitting position(s) ready to save for
								image <code>{selectedImageId}</code>.
							</Typography>
							{mappedPositions.map((p) => (
								<Typography key={p.id} variant="caption" display="block">
									{p.label} — ({p.x}, {p.y})
								</Typography>
							))}
							<Box sx={{ mt: 2, display: "flex", gap: 1 }}>
								<Button variant="outlined" onClick={() => setActiveStep(3)}>
									Back
								</Button>
								<Button
									variant="contained"
									onClick={handleSave}
									disabled={saveBulk.isPending}
									startIcon={
										saveBulk.isPending && <CircularProgress size={16} />
									}
								>
									Save
								</Button>
							</Box>
							{saveBulk.isError && (
								<Alert severity="error" sx={{ mt: 2 }}>
									Save failed. Please try again.
								</Alert>
							)}
						</>
					)}
				</Paper>
			)}

			{/* ── Action Footer ── */}
			{(activeStep === 3 || activeStep === 4) && (
				<Paper
					sx={{
						position: "sticky",
						bottom: 0,
						p: 2,
						mt: 2,
						display: "flex",
						alignItems: "center",
						gap: 2,
						borderTop: 1,
						borderColor: "divider",
					}}
					data-testid="admin-action-footer"
				>
					<ValidationSummaryRow totalCount={mappedPositions.length} />
					<Box sx={{ flexGrow: 1 }} />
					<Button
						variant="outlined"
						onClick={() => {
							setActiveStep(2);
							setMappedPositions([]);
							setPendingPos(null);
							setEditingLabel("");
							setSaveResult(null);
						}}
					>
						Cancel
					</Button>
					<Button
						variant="contained"
						onClick={handleSave}
						disabled={mappedPositions.length === 0 || saveBulk.isPending}
					>
						Save
					</Button>
					<Tooltip title="Available in enterprise deployment">
						<span>
							<Button variant="contained" disabled>
								Publish
							</Button>
						</span>
					</Tooltip>
				</Paper>
			)}
		</AdminMappingTemplate>
	);
}

export default AdminUploadMappingPage;
