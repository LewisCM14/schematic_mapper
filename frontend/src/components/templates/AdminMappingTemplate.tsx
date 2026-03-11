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
	onBack?: () => void;
	children: ReactNode;
}

function AdminMappingTemplate({
	title,
	steps,
	activeStep,
	showDisclaimer,
	onDismissDisclaimer,
	onBack,
	children,
}: AdminMappingTemplateProps) {
	return (
		<>
			<TopAppHeader title={title} onBack={onBack} />
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
			<Box sx={{ width: "100%", px: { xs: 2, md: 3 }, py: 3 }}>
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
