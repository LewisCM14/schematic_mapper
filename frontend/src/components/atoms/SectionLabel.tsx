import { Typography } from "@mui/material";

interface SectionLabelProps {
	children: string;
}

function SectionLabel({ children }: SectionLabelProps) {
	return (
		<Typography variant="overline" color="text.secondary">
			{children}
		</Typography>
	);
}

export default SectionLabel;
