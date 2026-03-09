import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import UploadSessionPanel from "./UploadSessionPanel";

function renderPanel(
	overrides: Partial<Parameters<typeof UploadSessionPanel>[0]> = {},
) {
	const defaults: Parameters<typeof UploadSessionPanel>[0] = {
		componentName: "",
		onComponentNameChange: vi.fn(),
		fileName: null,
		onFileChange: vi.fn(),
		uploadProgress: 0,
		uploadError: null,
		isUploading: false,
		showAbort: false,
		onUpload: vi.fn(),
		onAbort: vi.fn(),
		onBack: vi.fn(),
		uploadDisabled: true,
		abortDisabled: false,
		...overrides,
	};
	return render(
		<ThemeProvider theme={theme}>
			<UploadSessionPanel {...defaults} />
		</ThemeProvider>,
	);
}

describe("UploadSessionPanel", () => {
	it("renders component name input and upload button", () => {
		renderPanel();
		expect(
			screen.getByRole("textbox", { name: /component name/i }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /upload/i })).toBeInTheDocument();
	});

	it("shows error when uploadError is set", () => {
		renderPanel({ uploadError: "Network error" });
		expect(screen.getByText("Network error")).toBeInTheDocument();
	});

	it("shows abort button when showAbort is true", () => {
		renderPanel({ showAbort: true });
		expect(screen.getByRole("button", { name: /abort/i })).toBeInTheDocument();
	});
});
