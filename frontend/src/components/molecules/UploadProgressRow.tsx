/**
 * UploadProgressRow.tsx
 *
 * Displays a row showing the progress of a file upload operation.
 *
 * - Shows the file name, progress percentage, and a progress bar.
 * - Optionally displays a retry button if an upload can be retried.
 * - Used in upload dialogs or lists to track file upload status.
 */
import { Box, Button, LinearProgress, Typography } from "@mui/material";

interface UploadProgressRowProps {
	fileName: string;
	progress: number;
	onRetry?: () => void;
}

/**
 * Renders a row showing file upload progress, with optional retry button.
 * @param fileName The name of the file being uploaded
 * @param progress The upload progress percentage (0-100)
 * @param onRetry Optional handler for retrying the upload
 */
function UploadProgressRow({
	fileName,
	progress,
	onRetry,
}: UploadProgressRowProps) {
	return (
		<Box>
			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					mb: 0.5,
				}}
			>
				<Typography variant="caption" noWrap sx={{ maxWidth: "70%" }}>
					{fileName}
				</Typography>
				<Typography variant="caption">{progress}%</Typography>
			</Box>
			<LinearProgress variant="determinate" value={progress} />
			{onRetry && (
				<Box sx={{ mt: 0.5, textAlign: "right" }}>
					<Button size="small" onClick={onRetry}>
						Retry
					</Button>
				</Box>
			)}
		</Box>
	);
}

export default UploadProgressRow;
