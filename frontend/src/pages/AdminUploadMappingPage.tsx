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
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageTileCard from "../components/molecules/ImageTileCard";
import ValidationSummaryRow from "../components/molecules/ValidationSummaryRow";
import MappingWorkbench from "../components/organisms/MappingWorkbench";
import UploadSessionPanel from "../components/organisms/UploadSessionPanel";
import AdminMappingTemplate from "../components/templates/AdminMappingTemplate";
import type { BulkFittingPositionItem } from "../services/api/endpoints";
import {
	useDeleteFittingPosition,
	useSaveBulkFittingPositions,
} from "../services/api/hooks/useAdminUpload";
import { useChunkedUpload } from "../services/api/hooks/useChunkedUpload";
import { useDrawingTypes } from "../services/api/hooks/useDrawingTypes";
import { useFittingPositions } from "../services/api/hooks/useFittingPositions";
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
	width: number;
	height: number;
	label: string;
	persisted?: boolean;
}

type WorkflowMode = "upload" | "edit";

function AdminUploadMappingPage() {
	const navigate = useNavigate();
	const [showDisclaimer, setShowDisclaimer] = useState(true);
	const [activeStep, setActiveStep] = useState(0);
	const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("upload");

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
	const [persistedMappings, setPersistedMappings] = useState<MappedPos[]>([]);
	const [draftMappings, setDraftMappings] = useState<MappedPos[]>([]);
	const [pendingRect, setPendingRect] = useState<{
		x: number;
		y: number;
		width: number;
		height: number;
	} | null>(null);
	const [editingLabel, setEditingLabel] = useState("");
	const [mappingError, setMappingError] = useState<string | null>(null);
	const [mappingTab, setMappingTab] = useState(0); // 0 = Unmapped, 1 = Mapped
	const [selectedMappedPositionId, setSelectedMappedPositionId] = useState<string | null>(null);
	const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
	const [pendingDeletedPersistedMappings, setPendingDeletedPersistedMappings] = useState<
		MappedPos[]
	>([]);
	const { data: selectedImage } = useImage(selectedImageId ?? "");
	const { data: existingFittingPositions = [] } = useFittingPositions(
		selectedImageId ?? "",
	);

	// Step 5 — save
	const saveBulk = useSaveBulkFittingPositions();
	const deleteFittingPosition = useDeleteFittingPosition();
	const mappedPositions = useMemo(
		() => [...persistedMappings, ...draftMappings],
		[persistedMappings, draftMappings],
	);
	const canProceedToSave =
		mappedPositions.length > 0 || workflowMode === "edit";
	const isSaving = saveBulk.isPending || deleteFittingPosition.isPending;

	const mergedSelectableImages = useMemo(() => {
		const selectableImages =
			selectableImagesData?.pages.flatMap((page) => page.results) ?? [];
		const uploadedImageSummary =
			upload.completedImageId &&
			selectedImage &&
			selectedImage.image_id === upload.completedImageId
				? {
					image_id: selectedImage.image_id,
					drawing_type: selectedImage.drawing_type,
					component_name: selectedImage.component_name,
					width_px: selectedImage.width_px,
					height_px: selectedImage.height_px,
					uploaded_at: selectedImage.uploaded_at,
					thumbnail_url: selectedImage.thumbnail_url,
				}
				: null;
		return uploadedImageSummary &&
			!selectableImages.some(
				(image) => image.image_id === uploadedImageSummary.image_id,
			)
			? [uploadedImageSummary, ...selectableImages]
			: selectableImages;
	}, [selectableImagesData?.pages, selectedImage, upload.completedImageId]);

	// ── Handlers ─────────────────────────────────────────────────────────────

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const picked = e.target.files?.[0] ?? null;
		setFile(picked);
	}

	function normalizeLabel(label: string) {
		return label.trim().toLocaleLowerCase();
	}

	function resetMappingState() {
		setPersistedMappings([]);
		setDraftMappings([]);
		setPendingDeletedPersistedMappings([]);
		setPendingRect(null);
		setEditingLabel("");
		setMappingError(null);
		setMappingTab(0);
		setSelectedMappedPositionId(null);
		setDeleteCandidateId(null);
	}

	function getMappingCenter(position: MappedPos) {
		return {
			x: position.width > 0 ? position.x + position.width / 2 : position.x,
			y: position.height > 0 ? position.y + position.height / 2 : position.y,
		};
	}

	function formatMappingSummary(position: MappedPos) {
		const center = getMappingCenter(position);
		return position.width > 0 && position.height > 0
			? `${position.label} - ${position.width} x ${position.height} px, center at (${Math.round(
				center.x,
			)}, ${Math.round(center.y)})`
			: `${position.label} - center at (${Math.round(center.x)}, ${Math.round(center.y)})`;
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
		const normalizedLabel = normalizeLabel(editingLabel);
		if (!pendingRect || !normalizedLabel) return;
		if (
			mappedPositions.some(
				(position) => normalizeLabel(position.label) === normalizedLabel,
			)
		) {
			setMappingError("Label text must be unique per image.");
			setMappingTab(0);
			return;
		}
		setMappingError(null);
		setDraftMappings((prev) => [
			...prev,
			{
				id: `FP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
				x: pendingRect.x,
				y: pendingRect.y,
				width: pendingRect.width,
				height: pendingRect.height,
				label: editingLabel.trim(),
				persisted: false,
			},
		]);
		setPendingRect(null);
		setEditingLabel("");
		setMappingTab(1);
	}

	function handleMappedPositionSelect(positionId: string) {
		setSelectedMappedPositionId(positionId);
		setDeleteCandidateId(null);
		setMappingTab(1);
	}

	function handleRequestDeleteMappedPosition(positionId: string) {
		setSelectedMappedPositionId(positionId);
		setDeleteCandidateId(positionId);
		setMappingTab(1);
	}

	async function handleConfirmDeleteMappedPosition(positionId: string) {
		const existingPosition = persistedMappings.find(
			(position) => position.id === positionId,
		);
		if (!existingPosition) {
			setDraftMappings((prev) => prev.filter((position) => position.id !== positionId));
			setDeleteCandidateId(null);
			setSelectedMappedPositionId(null);
			return;
		}
		setPendingDeletedPersistedMappings((prev) => [...prev, existingPosition]);
		setPersistedMappings((prev) => prev.filter((position) => position.id !== positionId));
		setDeleteCandidateId(null);
		setSelectedMappedPositionId(null);
	}

	async function handleSave() {
		if (!selectedImageId) return;
		saveBulk.reset();
		deleteFittingPosition.reset();

		for (const position of pendingDeletedPersistedMappings) {
			await deleteFittingPosition.mutateAsync({
				fittingPositionId: position.id,
				imageId: selectedImageId,
			});
		}

		if (mappedPositions.length > 0) {
			const items: BulkFittingPositionItem[] = mappedPositions.map((p) => ({
				fitting_position_id: p.id,
				label_text: p.label,
				x_coordinate: Math.round(p.x + p.width / 2),
				y_coordinate: Math.round(p.y + p.height / 2),
				width: Math.round(p.width),
				height: Math.round(p.height),
			}));
			await saveBulk.mutateAsync({
				imageId: selectedImageId,
				fittingPositions: items,
			});
		}

		navigate("/");
	}

	// Auto-advance to Step 3 when an upload completes for the first time.
	useEffect(() => {
		if (!upload.completedImageId || activeStep !== 1 || selectedImageId) return;
		setSelectedImageId(upload.completedImageId);
		setActiveStep(2);
	}, [activeStep, selectedImageId, upload.completedImageId]);

	useEffect(() => {
		if (!selectedImageId) {
			resetMappingState();
			return;
		}
		setPendingRect(null);
		setEditingLabel("");
		setMappingError(null);
		setSelectedMappedPositionId(null);
		setDeleteCandidateId(null);
		setPendingDeletedPersistedMappings([]);
		setDraftMappings([]);
		if (workflowMode !== "edit") {
			setPersistedMappings([]);
		}
	}, [selectedImageId, workflowMode]);

	useEffect(() => {
		if (workflowMode !== "edit" || !selectedImageId) return;
		setPersistedMappings(
			existingFittingPositions.map((position) => ({
				id: position.fitting_position_id,
				x: Number(position.x_coordinate) - Number(position.width) / 2,
				y: Number(position.y_coordinate) - Number(position.height) / 2,
				width: Number(position.width),
				height: Number(position.height),
				label: position.label_text,
				persisted: true,
			})),
		);
		setPendingDeletedPersistedMappings([]);
		setMappingTab(existingFittingPositions.length > 0 ? 1 : 0);
	}, [existingFittingPositions, selectedImageId, workflowMode]);

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<AdminMappingTemplate
			title="Admin Panel"
			steps={STEPS}
			activeStep={activeStep}
			showDisclaimer={showDisclaimer}
			onDismissDisclaimer={() => setShowDisclaimer(false)}
			onBack={() => navigate("/")}
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
						<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
							<Button
								variant="contained"
								disabled={!selectedDrawingTypeId}
								onClick={() => {
									setWorkflowMode("upload");
									setActiveStep(1);
								}}
							>
								Next
							</Button>
							<Button
								variant="outlined"
								onClick={() => {
									setWorkflowMode("edit");
									setSelectedImageId(null);
									resetMappingState();
									setActiveStep(2);
								}}
							>
								Select Existing Image
							</Button>
						</Box>
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
						{workflowMode === "edit"
							? "Choose an image to review, add, or delete mappings."
							: "Choose an image from the available schematics for this drawing type."}
					</Typography>

					{selectableImagesLoading && (
						<Box
							sx={{ display: "flex", justifyContent: "center", mt: 4, mb: 2 }}
						>
							<CircularProgress size={28} />
						</Box>
					)}

					{!selectableImagesLoading && mergedSelectableImages.length === 0 ? (
						<Typography color="text.secondary">
							No images available for this drawing type.
						</Typography>
					) : (
						<Grid container spacing={2} alignItems="stretch">
							{mergedSelectableImages.map((img) => (
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
					)}

					<Box sx={{ mt: 2 }}>
						<Button
							variant="outlined"
							onClick={() => setActiveStep(workflowMode === "edit" ? 0 : 1)}
						>
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
						Drag a box around the link or component you are labeling, then enter
						its fitting position ID. Existing mappings can be selected from the
						Mapped tab to review and mark for deletion. Changes are only applied
						after you save.
					</Typography>

					{selectedImage ? (
						<MappingWorkbench
							imageSvgUrl={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(selectedImage.image_svg)}`}
							mappedPositions={mappedPositions}
							pendingRect={pendingRect}
							editingLabel={editingLabel}
							labelErrorText={mappingError}
							mappingTab={mappingTab}
							selectedMappedPositionId={selectedMappedPositionId}
							deleteCandidateId={deleteCandidateId}
							deleteInProgress={deleteFittingPosition.isPending}
							onMappingTabChange={setMappingTab}
							onRectangleDraw={(rectangle) => {
								setPendingRect(rectangle);
								setEditingLabel("");
								setMappingError(null);
								setMappingTab(0);
							}}
							onEditingLabelChange={(value) => {
								setEditingLabel(value);
								if (mappingError) {
									setMappingError(null);
								}
							}}
							onConfirmMarker={confirmMarker}
							onCancelMarker={() => {
								setPendingRect(null);
								setEditingLabel("");
								setMappingError(null);
							}}
							onMappedPositionSelect={handleMappedPositionSelect}
							onRequestDeleteMappedPosition={handleRequestDeleteMappedPosition}
							onConfirmDeleteMappedPosition={handleConfirmDeleteMappedPosition}
							onCancelDeleteMappedPosition={() => setDeleteCandidateId(null)}
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

				</Paper>
			)}

			{/* ── Step 5: Save ── */}
			{activeStep === 4 && (
				<Paper sx={{ p: 3 }}>
					<Typography variant="h6" gutterBottom>
						Validate &amp; Save
					</Typography>
					<Typography variant="body2" sx={{ mb: 2 }}>
						{mappedPositions.length === 0
							? `No fitting positions remain for image ${selectedImageId}. Saving will keep the image with no mappings.`
							: `${mappedPositions.length} fitting position(s) ready to save for image ${selectedImageId}.`}
					</Typography>
					{pendingDeletedPersistedMappings.length > 0 && (
						<Box sx={{ mb: 2 }}>
							<Typography variant="body2" sx={{ mb: 1 }}>
								{pendingDeletedPersistedMappings.length} saved fitting position(s) will be deleted when you save.
							</Typography>
							<Typography variant="subtitle2">Marked for Deletion</Typography>
							{pendingDeletedPersistedMappings.map((position) => (
								<Typography key={position.id} variant="caption" display="block">
									{formatMappingSummary(position)}
								</Typography>
							))}
						</Box>
					)}
					{mappedPositions.length > 0 && (
						<Box sx={{ mb: 2 }}>
							<Typography variant="subtitle2">Mapped</Typography>
							{mappedPositions.map((position) => (
								<Typography key={position.id} variant="caption" display="block">
									{formatMappingSummary(position)}
								</Typography>
							))}
						</Box>
					)}
					{(saveBulk.isError || deleteFittingPosition.isError) && (
						<Alert severity="error" sx={{ mt: 2 }}>
							Save failed. Please try again.
						</Alert>
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
						onClick={() => setActiveStep(activeStep === 3 ? 2 : 3)}
					>
						Back
					</Button>
					<Button
						variant="outlined"
						onClick={() => {
							setActiveStep(2);
							resetMappingState();
							setSelectedImageId(null);
						}}
					>
						Cancel
					</Button>
					<Button
						variant="contained"
						onClick={activeStep === 3 ? () => setActiveStep(4) : handleSave}
						disabled={!canProceedToSave || isSaving}
					>
						{activeStep === 3 ? "Review & Save" : "Save"}
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
