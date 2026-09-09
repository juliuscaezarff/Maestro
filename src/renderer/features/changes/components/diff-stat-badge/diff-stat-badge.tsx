import { cn } from "../../../../lib/utils";

interface DiffMiniBarProps {
	additions: number;
	deletions: number;
	className?: string;
}

/** Mini bar chart showing additions/deletions ratio as colored bars */
export function DiffMiniBar({ additions, deletions, className }: DiffMiniBarProps) {
	const total = additions + deletions;
	if (total === 0) return null;

	const maxBars = 5;
	const addBars = Math.max(additions > 0 ? 1 : 0, Math.round((additions / total) * maxBars));
	const delBars = Math.max(deletions > 0 ? 1 : 0, maxBars - addBars);

	return (
		<div className={cn("flex items-center gap-px", className)}>
			{Array.from({ length: addBars }).map((_, i) => (
				<div key={`a${i}`} className="w-[3px] h-3 rounded-[1px] bg-green-500 dark:bg-green-400" />
			))}
			{Array.from({ length: delBars }).map((_, i) => (
				<div key={`d${i}`} className="w-[3px] h-3 rounded-[1px] bg-red-500 dark:bg-red-400" />
			))}
		</div>
	);
}

interface DiffStatBadgeProps {
	fileCount: number;
	additions: number;
	deletions: number;
	className?: string;
}

/** "N files · ▐▐▐ +X −Y" summary badge, reused wherever a compact diff stat is needed */
export function DiffStatBadge({ fileCount, additions, deletions, className }: DiffStatBadgeProps) {
	const hasStats = additions > 0 || deletions > 0;

	return (
		<div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
			<span className="tabular-nums">
				{fileCount} file{fileCount !== 1 ? "s" : ""}
			</span>
			{hasStats && (
				<>
					<DiffMiniBar additions={additions} deletions={deletions} />
					<span className="tabular-nums text-green-600 dark:text-green-400">+{additions}</span>
					<span className="tabular-nums text-red-600 dark:text-red-400">−{deletions}</span>
				</>
			)}
		</div>
	);
}
