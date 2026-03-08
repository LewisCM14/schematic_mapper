import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Grid,
	LinearProgress,
	MenuItem,
	Paper,
	Select,
	Step,
	StepLabel,
	Stepper,
	Tab,
	Tabs,
	TextField,
	Typography,
} from "@mui/material";
import { useState } from "react";
import ImageTileCard from "../components/molecules/ImageTileCard";
import type { CanvasMarker } from "../components/organisms/DiagramCanvasViewport";
import DiagramCanvasViewport from "../components/organisms/DiagramCanvasViewport";
import TopAppHeader from "../components/TopAppHeader";
import type { BulkFittingPositionItem } from "../services/api/endpoints";
import {
	useAbortUpload,
	useCompleteUpload,
	useCreateUploadSession,
	useSaveBulkFittingPositions,
	useUploadChunk,
} from "../services/api/hooks/useAdminUpload";
import { useImage, useImages } from "../services/api/hooks/useImages";
import type { DrawingType } from "../services/api/schemas";

const STEPS = [
	"Select Type",
	"Upload Image",
	"Select Image",
	"Map Positions",
	"Save",
];

const CHUNK_SIZE = 64 * 1024; // 64 KB

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

interface MappedPos {
	id: string;
	x: number;
	y: number;
	label: string;
}

function AdminPage() {
	const [showDisclaimer, setShowDisclaimer] = useState(true);
	const [activeStep, setActiveStep] = useState(0);

	// Step 1
	const [selectedDrawingTypeId, setSelectedDrawingTypeId] = useState<
		number | ""
	>("");
	const { data: imagesData } = useImages();
	const images = imagesData?.pages.flatMap((p) => p.results) ?? [];

	// Derive unique drawing types from available images
	const drawingTypes: DrawingType[] = [];
	const seenIds = new Set<number>();
	for (const img of images) {
		if (!seenIds.has(img.drawing_type.drawing_type_id)) {
			seenIds.add(img.drawing_type.drawing_type_id);
			drawingTypes.push(img.drawing_type);
		}
	}

	// Step 2 — upload
	const [componentName, setComponentName] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [uploadProgress, setUploadProgress] = useState(0); // 0-100
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [uploadId, setUploadId] = useState<string | null>(null);
	const [idempotencyKey] = useState(() => crypto.randomUUID());

	const createSession = useCreateUploadSession();
	const uploadChunkMut = useUploadChunk();
	const completeUploadMut = useCompleteUpload();
	const abortUploadMut = useAbortUpload();

	// Step 3 — select uploaded image
	const [completedImageId, setCompletedImageId] = useState<string | null>(null);
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
	const { data: selectedImage } = useImage(completedImageId ?? "");

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
		setUploadError(null);
	}

	async function handleUpload() {
		if (
			!file ||
			!selectedDrawingTypeId ||
			typeof selectedDrawingTypeId !== "number"
		)
			return;

		setUploadError(null);
		setUploadProgress(0);

		try {
			const buffer = await file.arrayBuffer();
			const checksum = await sha256Hex(buffer);

			// Create session
			const session = await createSession.mutateAsync({
				drawingTypeId: selectedDrawingTypeId,
				componentName,
				fileName: file.name,
				fileSize: file.size,
				expectedChecksum: checksum,
				idempotencyKey,
			});
			setUploadId(session.upload_id);

			// Upload chunks
			const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE);
			for (let i = 0; i < totalChunks; i++) {
				const start = i * CHUNK_SIZE;
				const end = Math.min(start + CHUNK_SIZE, buffer.byteLength);
				const chunk = buffer.slice(start, end);
				const chunkB64 = arrayBufferToBase64(chunk);
				await uploadChunkMut.mutateAsync({
					uploadId: session.upload_id,
					partNumber: i + 1,
					chunkData: chunkB64,
				});
				setUploadProgress(Math.round(((i + 1) / totalChunks) * 90));
			}

			// Finalize
			const result = await completeUploadMut.mutateAsync({
				uploadId: session.upload_id,
				idempotencyKey,
			});
			setCompletedImageId(result.image_id);
			setUploadProgress(100);
			setActiveStep(2);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Upload failed";
			setUploadError(msg);
		}
	}

	async function handleAbort() {
		if (!uploadId) return;
		await abortUploadMut.mutateAsync(uploadId);
		setUploadId(null);
		setUploadProgress(0);
		setUploadError(null);
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
		if (!completedImageId) return;
		const items: BulkFittingPositionItem[] = mappedPositions.map((p) => ({
			fitting_position_id: p.id,
			label_text: p.label,
			x_coordinate: p.x,
			y_coordinate: p.y,
		}));
		const result = await saveBulk.mutateAsync({
			imageId: completedImageId,
			fittingPositions: items,
		});
		setSaveResult(result);
		setActiveStep(4);
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<>
			<TopAppHeader title="Admin Panel" />
			{showDisclaimer && (
				<Alert
					severity="warning"
					onClose={() => setShowDisclaimer(false)}
					sx={{ borderRadius: 0 }}
				>
					Admin area — this section is unprotected in the prototype build.
					Authentication will be enforced in the enterprise deployment.
				</Alert>
			)}
			<Box sx={{ maxWidth: 960, mx: "auto", p: 3 }}>
				<Typography variant="h5" gutterBottom>
					Admin — Upload &amp; Map
				</Typography>

				<Stepper activeStep={activeStep} sx={{ mb: 4 }}>
					{STEPS.map((label) => (
						<Step key={label}>
							<StepLabel>{label}</StepLabel>
						</Step>
					))}
				</Stepper>

				{/* ── Step 1: Select drawing type ── */}
				{activeStep === 0 && (
					<Paper sx={{ p: 3 }}>
						<Typography variant="h6" gutterBottom>
							Select Drawing Type
						</Typography>
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
						<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
							<TextField
								label="Component Name"
								value={componentName}
								onChange={(e) => setComponentName(e.target.value)}
								size="small"
								fullWidth
								inputProps={{ "aria-label": "component name" }}
							/>
							<Button
								component="label"
								variant="outlined"
								startIcon={<CloudUploadIcon />}
							>
								{file ? file.name : "Choose file"}
								<input
									type="file"
									hidden
									accept=".svg,.png,.jpg,.jpeg"
									onChange={handleFileChange}
									aria-label="file input"
								/>
							</Button>

							{uploadProgress > 0 && uploadProgress < 100 && (
								<Box>
									<Typography variant="caption">
										Uploading… {uploadProgress}%
									</Typography>
									<LinearProgress
										variant="determinate"
										value={uploadProgress}
									/>
								</Box>
							)}

							{uploadError && <Alert severity="error">{uploadError}</Alert>}

							<Box sx={{ display: "flex", gap: 1 }}>
								<Button
									variant="outlined"
									onClick={() => setActiveStep(0)}
									disabled={createSession.isPending || uploadChunkMut.isPending}
								>
									Back
								</Button>
								{uploadId && (
									<Button
										variant="outlined"
										color="warning"
										onClick={handleAbort}
										disabled={abortUploadMut.isPending}
									>
										Abort
									</Button>
								)}
								<Button
									variant="contained"
									onClick={handleUpload}
									disabled={
										!file ||
										!componentName.trim() ||
										createSession.isPending ||
										uploadChunkMut.isPending ||
										completeUploadMut.isPending
									}
									startIcon={
										(createSession.isPending ||
											uploadChunkMut.isPending ||
											completeUploadMut.isPending) && (
											<CircularProgress size={16} />
										)
									}
								>
									Upload
								</Button>
							</Box>
						</Box>
					</Paper>
				)}

				{/* ── Step 3: Select image ── */}
				{activeStep === 2 && (
					<Paper sx={{ p: 3 }}>
						{completedImageId && (
							<Alert severity="success" sx={{ mb: 2 }}>
								Upload complete — select an image to map.
							</Alert>
						)}
						<Typography variant="h6" gutterBottom>
							Select Image
						</Typography>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
							Choose an image from the available schematics for this drawing
							type.
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
													setCompletedImageId(imageId);
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
									onChange={(_e, v: number) => setMappingTab(v)}
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
													onChange={(e) => setEditingLabel(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter") confirmMarker();
														if (e.key === "Escape") {
															setPendingPos(null);
															setEditingLabel("");
														}
													}}
													autoFocus
													inputProps={{ "aria-label": "marker label" }}
												/>
												<Box sx={{ display: "flex", gap: 1 }}>
													<Button
														variant="contained"
														size="small"
														onClick={confirmMarker}
														disabled={!editingLabel.trim()}
													>
														Confirm
													</Button>
													<Button
														size="small"
														onClick={() => {
															setPendingPos(null);
															setEditingLabel("");
														}}
													>
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
							{selectedImage ? (
								<Box sx={{ flexGrow: 1, minWidth: 400 }}>
									<DiagramCanvasViewport
										imageSvgUrl={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(selectedImage.image_svg)}`}
										markers={mappedPositions.map<CanvasMarker>((p) => ({
											id: p.id,
											x: p.x,
											y: p.y,
											status: "unmapped",
										}))}
										onCanvasClick={(x, y) => {
											setPendingPos({ x, y });
											setEditingLabel("");
											setMappingTab(0); // switch to Unmapped tab
										}}
										onMarkerDrag={(id, x, y) => {
											setMappedPositions((prev) =>
												prev.map((p) => (p.id === id ? { ...p, x, y } : p)),
											);
										}}
									/>
								</Box>
							) : (
								<Box
									sx={{
										flexGrow: 1,
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
						</Box>

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
									image <code>{completedImageId}</code>.
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
			</Box>
		</>
	);
}

export default AdminPage;
