import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../../theme";
import AdminWorkflowStepper from "./AdminWorkflowStepper";

describe("AdminWorkflowStepper", () => {
	it("renders all step labels", () => {
		render(
			<ThemeProvider theme={theme}>
				<AdminWorkflowStepper
					steps={["Select Type", "Upload", "Map", "Save"]}
					activeStep={0}
				/>
			</ThemeProvider>,
		);
		expect(screen.getByText("Select Type")).toBeInTheDocument();
		expect(screen.getByText("Upload")).toBeInTheDocument();
		expect(screen.getByText("Map")).toBeInTheDocument();
		expect(screen.getByText("Save")).toBeInTheDocument();
	});
});
