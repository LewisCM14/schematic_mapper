import { Box, Button, LinearProgress, Typography } from "@mui/material";

interface UploadProgressRowProps {
	fileName: string;
	progress: number;
	onRetry?: () => void;
}

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
