/**
 * AdminMappingTemplate.tsx
 *
 * Provides a layout template for the admin mapping workflow, including header, disclaimer, stepper, and content area.
 *
 * - Renders the top app header, optional disclaimer, workflow stepper, and main content.
 * - Used for admin upload and mapping flows.
 */
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

/**
 * Renders the admin mapping workflow template with header, disclaimer, stepper, and content area.
 * @param title The page title
 * @param steps Array of workflow step labels
 * @param activeStep Index of the current active step
 * @param showDisclaimer Whether to show the admin disclaimer
 * @param onDismissDisclaimer Handler for dismissing the disclaimer
 * @param onBack Optional handler for back navigation
 * @param children Main content to render in the template
 */
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
