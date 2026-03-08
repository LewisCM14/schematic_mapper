import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import theme from "../theme";
import POITooltipCard from "./POITooltipCard";

function renderCard(
	props: {
		labelText?: string;
		componentName?: string;
		fittingPositionId?: string;
	} = {},
) {
	return render(
		<ThemeProvider theme={theme}>
			<POITooltipCard
				labelText={props.labelText ?? "PUMP-01-INLET"}
				componentName={props.componentName ?? "Engine Assembly"}
				fittingPositionId={props.fittingPositionId ?? "FP-PUMP-01"}
			/>
		</ThemeProvider>,
	);
}

describe("POITooltipCard", () => {
	it("renders the label text", () => {
		renderCard({ labelText: "VALVE-02-OUTLET" });
		expect(screen.getByText("VALVE-02-OUTLET")).toBeInTheDocument();
	});

	it("renders the component name badge", () => {
		renderCard({ componentName: "Turbine Assembly" });
		expect(screen.getByText("Turbine Assembly")).toBeInTheDocument();
	});

	it("renders the fitting position ID", () => {
		renderCard({ fittingPositionId: "FP-VALVE-99" });
		expect(screen.getByText("FP-VALVE-99")).toBeInTheDocument();
	});

	it("renders all three fields together", () => {
		renderCard({
			labelText: "PUMP-INLET",
			componentName: "Pump Assembly",
			fittingPositionId: "FP-PUMP-01",
		});
		expect(screen.getByText("PUMP-INLET")).toBeInTheDocument();
		expect(screen.getByText("Pump Assembly")).toBeInTheDocument();
		expect(screen.getByText("FP-PUMP-01")).toBeInTheDocument();
	});
});
