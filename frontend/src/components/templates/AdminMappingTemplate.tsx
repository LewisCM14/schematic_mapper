import { Alert, Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
import AdminWorkflowStepper from "../organisms/AdminWorkflowStepper";
import TopAppHeader from "../organisms/TopAppHeader";

interface AdminMappingTemplateProps {
	title: string;
	steps: string[];
	activeStep: number;
	showDisclaimer: boolean;
	onDismissDisclaimer: () => void;
	children: ReactNode;
}

function AdminMappingTemplate({
	title,
	steps,
	activeStep,
	showDisclaimer,
	onDismissDisclaimer,
	children,
}: AdminMappingTemplateProps) {
	return (
		<>
			<TopAppHeader title={title} />
			{showDisclaimer && (
				<Alert
					severity="warning"
					onClose={onDismissDisclaimer}
					sx={{ borderRadius: 0 }}
				>
					Admin area — this section is unprotected in the prototype build.
					Authentication will be enforced in the enterprise deployment.
				</Alert>
			)}
			<Box sx={{ maxWidth: 960, mx: "auto", p: 3 }}>
				<Typography variant="h5" gutterBottom>
					Admin — Upload &amp; Map
				</Typography>

				<AdminWorkflowStepper steps={steps} activeStep={activeStep} />

				{children}
			</Box>
		</>
	);
}

export default AdminMappingTemplate;
