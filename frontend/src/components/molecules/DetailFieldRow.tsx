import { Box, Typography } from "@mui/material";

interface DetailFieldRowProps {
	label: string;
	value: string | null;
}

function DetailFieldRow({ label, value }: DetailFieldRowProps) {
	return (
		<Box>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
			<Typography variant="body2">{value ?? "—"}</Typography>
		</Box>
	);
}

export default DetailFieldRow;
