import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import theme from "../../theme";
import SourceFilterChips from "./SourceFilterChips";

function renderChips(
	props: Partial<React.ComponentProps<typeof SourceFilterChips>> = {},
) {
	const defaults = {
		availableSources: ["internal", "asset"],
		selectedSources: ["internal", "asset"],
		onToggle: vi.fn(),
		...props,
	};
	return {
		onToggle: defaults.onToggle,
		...render(
			<ThemeProvider theme={theme}>
				<SourceFilterChips {...defaults} />
			</ThemeProvider>,
		),
	};
}

describe("SourceFilterChips", () => {
	it("renders all available sources as chips", () => {
		renderChips();
		expect(screen.getByText("internal")).toBeInTheDocument();
		expect(screen.getByText("asset")).toBeInTheDocument();
	});

	it("renders disabled sources as disabled chips", () => {
		renderChips({ disabledSources: ["sensor"] });
		const chipEl = screen.getByText("sensor").closest(".MuiChip-root");
		expect(chipEl).toHaveClass("Mui-disabled");
	});

	it("calls onToggle when an enabled chip is clicked", async () => {
		const onToggle = vi.fn();
		renderChips({ onToggle });
		await userEvent.click(screen.getByText("internal"));
		expect(onToggle).toHaveBeenCalledWith("internal");
	});

	it("marks selected sources with aria-pressed true", () => {
		renderChips({ selectedSources: ["internal"] });
		expect(
			screen.getByText("internal").closest(".MuiChip-root"),
		).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByText("asset").closest(".MuiChip-root")).toHaveAttribute(
			"aria-pressed",
			"false",
		);
	});
});
