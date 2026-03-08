import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PlaceIcon from "@mui/icons-material/Place";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	IconButton,
	LinearProgress,
	MenuItem,
	Paper,
	Select,
	Step,
	StepLabel,
	Stepper,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useRef, useState } from "react";
import type { BulkFittingPositionItem } from "../services/api/endpoints";
import {
	useAbortUpload,
	useCompleteUpload,
	useCreateUploadSession,
	useSaveBulkFittingPositions,
	useUploadChunk,
} from "../services/api/hooks/useAdminUpload";
import { useImages } from "../services/api/hooks/useImages";
import type { DrawingType } from "../services/api/schemas";
import TopAppHeader from "../components/TopAppHeader";

const STEPS = [
	"Select Type",
	"Upload Image",
	"Confirm Upload",
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
	const [activeStep, setActiveStep] = useState(0);

	// Step 1
	const [selectedDrawingTypeId, setSelectedDrawingTypeId] = useState<
		number | ""
	>("");
	const { data: images } = useImages();

	// Derive unique drawing types from available images
	const drawingTypes: DrawingType[] = [];
	const seenIds = new Set<number>();
	for (const img of images ?? []) {
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

	// Step 3 — completed upload image_id
	const [completedImageId, setCompletedImageId] = useState<string | null>(null);

	// Step 4 — mapping
	const [mappedPositions, setMappedPositions] = useState<MappedPos[]>([]);
	const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(
		null,
	);
	const [editingLabel, setEditingLabel] = useState("");
	const canvasRef = useRef<HTMLDivElement | null>(null);

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

	function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
		if (!canvasRef.current) return;
		const rect = canvasRef.current.getBoundingClientRect();
		const x = Math.round(e.clientX - rect.left);
		const y = Math.round(e.clientY - rect.top);
		setPendingPos({ x, y });
		setEditingLabel("");
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
								<LinearProgress variant="determinate" value={uploadProgress} />
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

			{/* ── Step 3: Confirm ── */}
			{activeStep === 2 && (
				<Paper sx={{ p: 3 }}>
					<Alert severity="success" sx={{ mb: 2 }}>
						Upload complete.
					</Alert>
					<Typography variant="body2">
						Image ID: <code>{completedImageId}</code>
					</Typography>
					<Box sx={{ mt: 2, display: "flex", gap: 1 }}>
						<Button variant="outlined" onClick={() => setActiveStep(1)}>
							Back
						</Button>
						<Button variant="contained" onClick={() => setActiveStep(3)}>
							Map Fitting Positions
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
						{/* Canvas area */}
						<Box
							ref={canvasRef}
							onClick={handleCanvasClick}
							sx={{
								position: "relative",
								width: 600,
								height: 400,
								border: "1px dashed",
								borderColor: "divider",
								borderRadius: 1,
								cursor: "crosshair",
								flexShrink: 0,
								bgcolor: "grey.50",
							}}
							role="button"
							aria-label="mapping canvas"
						>
							{mappedPositions.map((pos) => (
								<Tooltip key={pos.id} title={pos.label} arrow>
									<IconButton
										size="small"
										sx={{
											position: "absolute",
											left: pos.x,
											top: pos.y,
											transform: "translate(-50%, -100%)",
											color: "success.main",
											padding: 0,
											pointerEvents: "none",
										}}
									>
										<PlaceIcon fontSize="medium" />
									</IconButton>
								</Tooltip>
							))}

							{pendingPos && (
								<IconButton
									size="small"
									sx={{
										position: "absolute",
										left: pendingPos.x,
										top: pendingPos.y,
										transform: "translate(-50%, -100%)",
										color: "warning.main",
										padding: 0,
										pointerEvents: "none",
									}}
								>
									<PlaceIcon fontSize="medium" />
								</IconButton>
							)}
						</Box>

						{/* Label entry */}
						<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
							{pendingPos ? (
								<>
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
								</>
							) : (
								<Typography variant="body2" color="text.secondary">
									{mappedPositions.length === 0
										? "Click the canvas to place the first marker."
										: `${mappedPositions.length} marker(s) placed.`}
								</Typography>
							)}

							{mappedPositions.length > 0 && (
								<Box sx={{ mt: 1 }}>
									{mappedPositions.map((p) => (
										<Typography key={p.id} variant="caption" display="block">
											{p.label} — ({p.x}, {p.y})
										</Typography>
									))}
								</Box>
							)}
						</Box>
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
