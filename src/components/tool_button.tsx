import React from "react";
import { Tooltip } from "@fluentui/react-components";

interface ToolButtonProps {
	/** The SVG icon to display */
	icon: React.ReactNode;
	/** The label text to display below the icon */
	label: string;
	/** Tooltip text to show on hover */
	tooltip: string;
	/** Click handler */
	onClick?: () => void;
	/** Whether the button is disabled */
	disabled?: boolean;
}

export const ToolButton: React.FC<ToolButtonProps> = ({
	icon,
	label,
	tooltip,
	onClick,
	disabled = false,
}) => {
	const buttonContent = (
		<button
			className="tool-button"
			onClick={onClick}
			disabled={disabled}
			type="button"
		>
			<div className="icon">
				<svg id="logo" width={45} height={45}>
					<use href={`${icon}`} />
				</svg>
			</div>
			<span className="label">{label}</span>
		</button>
	);

	return (
		<Tooltip content={tooltip} relationship="label">
			{buttonContent}
		</Tooltip>
	);
};
