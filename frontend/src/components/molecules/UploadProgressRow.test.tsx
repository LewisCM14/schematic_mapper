import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import UploadProgressRow from "./UploadProgressRow";

describe("UploadProgressRow", () => {
	it("renders file name and progress", () => {
		render(
			<ThemeProvider theme={theme}>
				<UploadProgressRow fileName="diagram.svg" progress={45} />
			</ThemeProvider>,
		);
		expect(screen.getByText("diagram.svg")).toBeInTheDocument();
		expect(screen.getByText("45%")).toBeInTheDocument();
		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("shows retry button when onRetry is provided", async () => {
		const onRetry = vi.fn();
		render(
			<ThemeProvider theme={theme}>
				<UploadProgressRow
					fileName="diagram.svg"
					progress={50}
					onRetry={onRetry}
				/>
			</ThemeProvider>,
		);
		await userEvent.click(screen.getByRole("button", { name: /retry/i }));
		expect(onRetry).toHaveBeenCalledOnce();
	});
});
