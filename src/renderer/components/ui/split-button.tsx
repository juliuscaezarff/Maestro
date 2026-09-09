import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "./dropdown-menu";
import { cn } from "../../lib/utils";

export interface SplitButtonProps extends Omit<ButtonProps, "children"> {
	/** Main button label */
	label: string;
	/** Icon to show before label */
	icon?: React.ReactNode;
	/** Badge to show after label (e.g., "↑3") */
	badge?: string;
	/** Handler for main button click */
	onClick: () => void;
	/** Dropdown menu content */
	dropdownContent?: React.ReactNode;
	/** Whether to show the dropdown trigger */
	showDropdown?: boolean;
	/** Optional sizing overrides for the dropdown trigger */
	dropdownTriggerClassName?: string;
	/** Accessible label for the dropdown trigger */
	dropdownAriaLabel?: string;
}

export function SplitButton({
	label,
	icon,
	badge,
	onClick,
	dropdownContent,
	showDropdown = true,
	dropdownTriggerClassName,
	dropdownAriaLabel = "More options",
	disabled,
	variant = "default",
	size = "sm",
	className,
	...props
}: SplitButtonProps) {
	// If no dropdown content, render just the button
	if (!showDropdown || !dropdownContent) {
		return (
			<Button
				variant={variant}
				size={size}
				onClick={onClick}
				disabled={disabled}
				className={cn("gap-1.5", className)}
				{...props}
			>
				{icon}
				<span>{label}</span>
				{badge && (
					<span className="text-[10px] opacity-80">{badge}</span>
				)}
			</Button>
		);
	}

	return (
		<div className="inline-flex -space-x-px rounded-md shadow-sm shadow-black/5">
			{/* Main action button */}
			<Button
				variant={variant}
				size={size}
				onClick={onClick}
				disabled={disabled}
				className={cn(
					"gap-1.5 rounded-r-none focus:z-10",
					className
				)}
				{...props}
			>
				{icon}
				<span>{label}</span>
				{badge && (
					<span className="text-[10px] opacity-80">{badge}</span>
				)}
			</Button>

			{/* Dropdown trigger */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant={variant}
						size="icon"
						disabled={disabled}
						className={cn(
							"rounded-l-none border-l border-primary-foreground/25 focus:z-10",
							dropdownTriggerClassName,
						)}
						aria-label={dropdownAriaLabel}
					>
						<ChevronDown className="size-3.5" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-[160px]">
					{dropdownContent}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
