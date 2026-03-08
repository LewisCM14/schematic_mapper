import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
	interface Palette {
		map: {
			canvas: { bg: string };
			grid: { line: string };
			poi: {
				default: string;
				selected: string;
				cluster: string;
				unmapped: string;
			};
		};
		panel: {
			drawer: {
				bg: string;
				tab: { active: string; text: { active: string } };
			};
		};
		footer: { bg: string; text: string };
	}
	interface PaletteOptions {
		map?: {
			canvas?: { bg?: string };
			grid?: { line?: string };
			poi?: {
				default?: string;
				selected?: string;
				cluster?: string;
				unmapped?: string;
			};
		};
		panel?: {
			drawer?: {
				bg?: string;
				tab?: { active?: string; text?: { active?: string } };
			};
		};
		footer?: { bg?: string; text?: string };
	}
	interface TypographyVariants {
		monoFontFamily: string;
	}
	interface TypographyVariantsOptions {
		monoFontFamily?: string;
	}
}

const theme = createTheme({
	palette: {
		primary: {
			main: "#0B6BCB",
			dark: "#084F97",
			light: "#E7F1FB",
		},
		secondary: {
			main: "#0F766E",
		},
		background: {
			default: "#F4F7FB",
			paper: "#FFFFFF",
		},
		text: {
			primary: "#102A43",
			secondary: "#486581",
		},
		divider: "#D9E2EC",
		success: {
			main: "#1E8E3E",
		},
		warning: {
			main: "#B7791F",
		},
		error: {
			main: "#C53030",
		},
		info: {
			main: "#2563EB",
		},
		map: {
			canvas: { bg: "#EEF3F8" },
			grid: { line: "#D7E2EE" },
			poi: {
				default: "#0B6BCB",
				selected: "#C53030",
				cluster: "#0F766E",
				unmapped: "#B7791F",
			},
		},
		panel: {
			drawer: {
				bg: "#FFFFFF",
				tab: { active: "#E7F1FB", text: { active: "#0B6BCB" } },
			},
		},
		footer: { bg: "#102A43", text: "#F8FAFC" },
	},
	typography: {
		fontFamily: "'Public Sans', 'Segoe UI', sans-serif",
		monoFontFamily: "'IBM Plex Mono', 'Courier New', monospace",
		h1: { fontSize: "2.5rem", lineHeight: "3rem", fontWeight: 700 },
		h2: { fontSize: "2rem", lineHeight: "2.5rem", fontWeight: 700 },
		h3: { fontSize: "1.5rem", lineHeight: "2rem", fontWeight: 600 },
		h4: { fontSize: "1.25rem", lineHeight: "1.75rem", fontWeight: 600 },
		body1: { fontSize: "1rem", lineHeight: "1.5rem", fontWeight: 400 },
		body2: { fontSize: "0.875rem", lineHeight: "1.25rem", fontWeight: 400 },
		caption: { fontSize: "0.75rem", lineHeight: "1rem", fontWeight: 500 },
		button: { fontSize: "0.875rem", lineHeight: "1.25rem", fontWeight: 600 },
	},
	components: {
		MuiButton: {
			styleOverrides: {
				root: {
					textTransform: "none",
				},
			},
		},
	},
});

export default theme;
