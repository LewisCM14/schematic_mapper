import { Step, StepLabel, Stepper } from "@mui/material";

interface AdminWorkflowStepperProps {
	steps: string[];
	activeStep: number;
}

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
