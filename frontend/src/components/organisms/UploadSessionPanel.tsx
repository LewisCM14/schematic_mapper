/**
 * UploadSessionPanel.tsx
 *
 * Provides a UI panel for uploading a new image file and entering a component name.
 *
 * - Handles file selection, upload progress, error display, and abort/back actions.
 * - Used in admin workflows for uploading schematic images.
 */
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Alert, Box, Button, CircularProgress, TextField } from "@mui/material";
import UploadProgressRow from "../molecules/UploadProgressRow";

interface UploadSessionPanelProps {
	componentName: string;
	onComponentNameChange: (value: string) => void;
	fileName: string | null;
	onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	uploadProgress: number;
	uploadError: string | null;
	isUploading: boolean;
	showAbort: boolean;
	onUpload: () => void;
	onAbort: () => void;
	onBack: () => void;
	uploadDisabled: boolean;
	abortDisabled: boolean;
}

/**
 * Renders a panel for uploading a new image file and entering a component name.
 * Handles file selection, upload progress, error display, and abort/back actions.
 *
 * @param componentName The current component name input
 * @param onComponentNameChange Handler for component name changes
 * @param fileName The name of the selected file (or null)
 * @param onFileChange Handler for file input changes
 * @param uploadProgress Current upload progress percentage
 * @param uploadError Error message for upload failures (or null)
 * @param isUploading Whether an upload is in progress
 * @param showAbort Whether to show the abort button
 * @param onUpload Handler for starting the upload
 * @param onAbort Handler for aborting the upload
 * @param onBack Handler for navigating back
 * @param uploadDisabled Whether the upload button is disabled
 * @param abortDisabled Whether the abort button is disabled
 */
function UploadSessionPanel({
	componentName,
	onComponentNameChange,
	fileName,
	onFileChange,
	uploadProgress,
	uploadError,
	isUploading,
	showAbort,
	onUpload,
	onAbort,
	onBack,
	uploadDisabled,
	abortDisabled,
}: UploadSessionPanelProps) {
	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<TextField
				label="Component Name"
				value={componentName}
				onChange={(e) => onComponentNameChange(e.target.value)}
				size="small"
				fullWidth
				inputProps={{ "aria-label": "component name" }}
			/>
			<Button
				component="label"
				variant="outlined"
				startIcon={<CloudUploadIcon />}
			>
				{fileName ?? "Choose file"}
				<input
					type="file"
					hidden
					accept=".svg,.png,.jpg,.jpeg"
					onChange={onFileChange}
					aria-label="file input"
				/>
			</Button>

			{uploadProgress > 0 && uploadProgress < 100 && (
				<UploadProgressRow
					fileName={fileName ?? "file"}
					progress={uploadProgress}
				/>
			)}

			{uploadError && <Alert severity="error">{uploadError}</Alert>}

			<Box sx={{ display: "flex", gap: 1 }}>
				<Button variant="outlined" onClick={onBack} disabled={isUploading}>
					Back
				</Button>
				{showAbort && (
					<Button
						variant="outlined"
						color="warning"
						onClick={onAbort}
						disabled={abortDisabled}
					>
						Abort
					</Button>
				)}
				<Button
					variant="contained"
					onClick={onUpload}
					disabled={uploadDisabled}
					startIcon={isUploading && <CircularProgress size={16} />}
				>
					Upload
				</Button>
			</Box>
		</Box>
	);
}

export default UploadSessionPanel;
