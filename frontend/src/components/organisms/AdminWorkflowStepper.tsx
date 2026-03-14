/**
 * AdminWorkflowStepper.tsx
 *
 * Renders a stepper component for visualizing multi-step admin workflows.
 *
 * - Displays a horizontal stepper with labels for each step.
 * - Highlights the active step.
 * - Used in admin panels to guide users through multi-stage processes.
 */
import { Step, StepLabel, Stepper } from "@mui/material";

interface AdminWorkflowStepperProps {
	steps: string[];
	activeStep: number;
}

/**
 * Renders a horizontal stepper for admin workflows, highlighting the active step.
 * @param steps Array of step labels
 * @param activeStep Index of the currently active step
 */
function AdminWorkflowStepper({
	steps,
	activeStep,
}: AdminWorkflowStepperProps) {
	return (
		<Stepper activeStep={activeStep} sx={{ mb: 4 }}>
			{steps.map((label) => (
				<Step key={label}>
					<StepLabel>{label}</StepLabel>
				</Step>
			))}
		</Stepper>
	);
}

export default AdminWorkflowStepper;
