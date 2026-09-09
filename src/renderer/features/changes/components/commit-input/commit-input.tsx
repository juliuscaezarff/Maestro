import { Button } from "../../../../components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../../components/ui/tooltip";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { cn } from "../../../../lib/utils";
import { IconSpinner } from "../../../../components/ui/icons";
import { useCommitActions } from "./use-commit-actions";

interface CommitInputProps {
	worktreePath: string;
	hasStagedChanges: boolean;
	onRefresh: () => void;
	/** Called after a successful commit to reset UI state */
	onCommitSuccess?: () => void;
	stagedCount?: number;
	currentBranch?: string;
	/** File paths selected for commit - will be staged before committing */
	selectedFilePaths?: string[];
	/** Chat ID for AI-generated commit messages */
	chatId?: string;
}

// Same easing/duration as the git-activity expand/collapse (git-activity-badges.tsx)
const DESCRIPTION_TRANSITION = { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const };

export function CommitInput({
	worktreePath,
	hasStagedChanges,
	onRefresh,
	onCommitSuccess,
	stagedCount,
	currentBranch,
	selectedFilePaths,
	chatId,
}: CommitInputProps) {
	const [summary, setSummary] = useState("");
	const [description, setDescription] = useState("");
	const [showDescription, setShowDescription] = useState(false);
	const descriptionRef = useRef<HTMLTextAreaElement>(null);

	const { commit, generate, isPending, isGenerating } = useCommitActions({
		worktreePath,
		chatId,
		onRefresh,
		onCommitSuccess: () => {
			setSummary("");
			setDescription("");
			setShowDescription(false);
			onCommitSuccess?.();
		},
		onMessageGenerated: (message) => setSummary(message),
	});

	const descriptionVisible = showDescription || description.trim().length > 0;

	// Focus the description textarea as soon as it's revealed
	useEffect(() => {
		if (showDescription) {
			descriptionRef.current?.focus();
		}
	}, [showDescription]);

	// Auto-grow the description textarea (same technique as prompt-input.tsx)
	useLayoutEffect(() => {
		const textarea = descriptionRef.current;
		if (!textarea || !descriptionVisible) return;
		textarea.style.height = "auto";
		textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
	}, [description, descriptionVisible]);

	// Build full commit message from summary and description
	const getCommitMessage = () => {
		const trimmedSummary = summary.trim();
		const trimmedDescription = description.trim();
		if (trimmedDescription) {
			return `${trimmedSummary}\n\n${trimmedDescription}`;
		}
		return trimmedSummary;
	};

	// Can commit if files are selected (will auto-generate message if needed)
	const canCommit = hasStagedChanges;
	const canGenerate = !!chatId && !isPending;

	const handleCommit = async () => {
		if (!canCommit) return;

		const commitMessage = getCommitMessage();
		await commit({ message: commitMessage, filePaths: selectedFilePaths });
	};

	const handleGenerate = async () => {
		if (!canGenerate) return;
		await generate(selectedFilePaths);
	};

	const handleDescriptionBlur = () => {
		if (description.trim() === "") {
			setShowDescription(false);
		}
	};

	// Build dynamic commit label
	const getCommitLabel = () => {
		if (stagedCount && stagedCount > 0 && currentBranch) {
			return `Commit ${stagedCount} to ${currentBranch}`;
		}
		if (currentBranch) {
			return `Commit to ${currentBranch}`;
		}
		return "Commit";
	};

	const getTooltip = () => {
		if (!hasStagedChanges) return "No staged changes";
		if (!summary.trim()) return "AI will generate commit message";
		return "Commit staged changes";
	};

	return (
		<div className="p-2 bg-background">
			<div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5">
				{/* Summary input - single line, with inline AI-generate affordance */}
				<div className="relative">
					<input
						type="text"
						placeholder="Commit message"
						value={summary}
						onChange={(e) => setSummary(e.target.value)}
						className={cn(
							"w-full pl-2.5 py-2 text-sm rounded-md",
							"bg-background border border-input",
							"placeholder:text-muted-foreground",
							"focus:outline-none focus:ring-1 focus:ring-ring",
							canGenerate ? "pr-8" : "pr-2.5",
						)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canCommit) {
								e.preventDefault();
								handleCommit();
							}
						}}
					/>
					{canGenerate && (
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={handleGenerate}
									disabled={!canGenerate}
									aria-label="Generate commit message with AI"
									className={cn(
										"absolute right-1.5 top-1/2 -translate-y-1/2 size-6 rounded",
										"flex items-center justify-center shrink-0",
										"text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors",
										"disabled:opacity-50 disabled:pointer-events-none",
									)}
								>
									{isGenerating ? (
										<IconSpinner className="size-3.5 animate-spin" />
									) : (
										<Sparkles className="size-3.5" />
									)}
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">Generate with AI</TooltipContent>
						</Tooltip>
					)}
				</div>

				{/* Description - progressively disclosed, auto-growing */}
				<AnimatePresence initial={false}>
					{descriptionVisible && (
						<motion.div
							key="description"
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={DESCRIPTION_TRANSITION}
							className="overflow-hidden"
						>
							<textarea
								ref={descriptionRef}
								placeholder="Description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								onBlur={handleDescriptionBlur}
								className={cn(
									"w-full px-2.5 py-1.5 text-xs rounded-md resize-none",
									"bg-background border border-input",
									"placeholder:text-muted-foreground",
									"focus:outline-none focus:ring-1 focus:ring-ring",
									"min-h-[32px]",
								)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canCommit) {
										e.preventDefault();
										handleCommit();
									}
								}}
							/>
						</motion.div>
					)}
				</AnimatePresence>
				{!descriptionVisible && (
					<button
						type="button"
						onClick={() => setShowDescription(true)}
						className="self-start text-[11px] text-muted-foreground hover:text-foreground transition-colors"
					>
						+ Add description
					</button>
				)}

				{/* Commit button - simple, no dropdown */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="default"
							size="sm"
							className="w-full h-8 text-xs overflow-hidden"
							onClick={handleCommit}
							disabled={!canCommit || isPending}
						>
							{isPending ? (
								<>
									<IconSpinner className="h-3 w-3 mr-1.5 animate-spin" />
									<span className="truncate">{isGenerating ? "Generating..." : "Committing..."}</span>
								</>
							) : (
								<span className="truncate">{getCommitLabel()}</span>
							)}
						</Button>
					</TooltipTrigger>
					<TooltipContent side="top">{getTooltip()}</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}
