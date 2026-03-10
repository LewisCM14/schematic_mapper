import { useTheme } from "@mui/material/styles";
import { memo } from "react";

interface POIMarkerPinProps {
	selected: boolean;
}

const POIMarkerPin = memo(function POIMarkerPin({
	selected,
}: POIMarkerPinProps) {
	const theme = useTheme();
	const fill = selected
		? theme.palette.map.poi.selected
		: theme.palette.map.poi.default;
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="8" fill={fill} />
		</svg>
	);
});

export default POIMarkerPin;
