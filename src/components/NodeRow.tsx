import { useEffect, useRef, useState } from "react";
import { FileText, Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DataRoomNode } from "@/lib/db/schema";
import { formatBytes, formatDate } from "@/lib/format";

interface NodeRowProps {
  node: DataRoomNode;
  /** Direct child count, only meaningful (and passed) when node.type === 'folder'. */
  itemCount?: number;
  /** True right after this node was created or renamed, so it can grab focus and flash once. */
  shouldFocus?: boolean;
  /** Called once shouldFocus has been acted on, so the parent can reset it. */
  onFocusHandled?: () => void;
  onOpen: (node: DataRoomNode) => void;
  onRename: (node: DataRoomNode) => void;
  onDelete: (node: DataRoomNode) => void;
}

const HIGHLIGHT_DURATION_MS = 1500;

export function NodeRow({
  node,
  itemCount,
  shouldFocus,
  onFocusHandled,
  onOpen,
  onRename,
  onDelete,
}: NodeRowProps) {
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  // Holds the fade-out timeout outside of React's effect-cleanup cycle: the parent resets
  // shouldFocus back to false right after this effect runs, and a cleanup tied to that
  // dependency would cancel the timeout before it ever fires.
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!shouldFocus) return;
    // Imperative DOM focus/scroll on a freshly created or renamed row, so the user can
    // see and locate what they just did. Not derivable from props/state, so an effect is right.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHighlighted(true);
    openButtonRef.current?.focus({ preventScroll: true });
    openButtonRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    onFocusHandled?.();
    clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(
      () => setIsHighlighted(false),
      HIGHLIGHT_DURATION_MS,
    );
  }, [shouldFocus, onFocusHandled]);

  useEffect(() => () => clearTimeout(highlightTimerRef.current), []);

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-100 ${
        isHighlighted
          ? "border-primary/40 bg-accent"
          : "border-transparent hover:border-border hover:bg-accent/50"
      }`}
    >
      <button
        ref={openButtonRef}
        type="button"
        onClick={() => onOpen(node)}
        aria-label={node.name}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        {node.type === "folder" ? (
          <Folder
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <FileText
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="min-w-0 flex-1 truncate text-sm font-medium"
              aria-hidden="true"
            >
              {node.name}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" align="start" className="max-w-80 break-words">
            {node.name}
          </TooltipContent>
        </Tooltip>
        <span
          className="hidden shrink-0 text-xs text-muted-foreground sm:block"
          aria-hidden="true"
        >
          {node.type === "file"
            ? formatBytes(node.size)
            : itemCount !== undefined
              ? `${itemCount} item${itemCount === 1 ? "" : "s"}`
              : ""}
        </span>
        <span
          className="hidden w-36 shrink-0 text-right text-xs text-muted-foreground md:block"
          aria-hidden="true"
        >
          {formatDate(node.createdAt)}
        </span>
      </button>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
                aria-label={`Actions for ${node.name}`}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Actions</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onRename(node)}>
            <Pencil className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(node)}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
