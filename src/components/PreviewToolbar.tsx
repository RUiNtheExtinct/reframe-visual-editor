"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  CheckSquareIcon,
  Code2,
  Crosshair,
  Eye,
  Lock,
  Monitor,
  RotateCcw,
  Smartphone,
  Square,
  SquareDashed,
  Tablet,
  Unlock,
} from "lucide-react";

type PreviewDevice = "desktop" | "tablet" | "mobile" | "custom";
type EditorTab = "ui" | "code";

export type PreviewToolbarProps = {
  className?: string;
  // Device and sizing
  previewDevice: PreviewDevice;
  onPreviewDeviceChange: (device: PreviewDevice) => void;
  customPreviewWidth: number;
  customPreviewHeight: number;
  onChangeCustomWidth: (next: number) => void;
  onChangeCustomHeight: (next: number) => void;

  // Flags and actions
  selectionEnabled: boolean;
  onToggleSelection: () => void;
  isSplitLocked: boolean;
  onToggleSplitLock: () => void;
  onResetLayout: () => void;

  // Optional: preview frame toggle (Sandbox only)
  showPreviewFrame?: boolean;
  onTogglePreviewFrame?: () => void;

  // Tabs and copy
  activeTab: EditorTab;
  onChangeTab: (tab: EditorTab) => void;
  copyButtonText?: string;
  onClickCopy: () => void | Promise<void>;
  onClickSave?: () => void | Promise<void>;
};

export default function PreviewToolbar(props: PreviewToolbarProps) {
  const {
    className,
    previewDevice,
    onPreviewDeviceChange,
    customPreviewWidth,
    customPreviewHeight,
    onChangeCustomWidth,
    onChangeCustomHeight,
    selectionEnabled,
    onToggleSelection,
    isSplitLocked,
    onToggleSplitLock,
    onResetLayout,
    showPreviewFrame,
    onTogglePreviewFrame,
    activeTab,
    onChangeTab,
    copyButtonText = "Copy TSX",
    onClickCopy,
    onClickSave,
  } = props;

  return (
    <div className={cn("flex flex-wrap items-center gap-2 w-full xl:w-auto", className)}>
      <div className="hidden xl:flex items-center gap-2">
        <Select
          value={previewDevice}
          onValueChange={(v) => onPreviewDeviceChange(v as PreviewDevice)}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue placeholder="Preview device" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desktop">
              <div className="flex items-center gap-2">
                <Monitor className="size-4" /> <span>Desktop</span>
              </div>
            </SelectItem>
            <SelectItem value="tablet">
              <div className="flex items-center gap-2">
                <Tablet className="size-4" /> <span>Tablet</span>
              </div>
            </SelectItem>
            <SelectItem value="mobile">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4" /> <span>Mobile</span>
              </div>
            </SelectItem>
            <SelectItem value="custom">
              <div className="flex items-center gap-2">
                <SquareDashed className="size-4" /> <span>Custom…</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {previewDevice === "custom" && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              className="w-20 h-8 rounded-md border bg-background px-2 text-xs"
              value={customPreviewWidth}
              onChange={(e) => onChangeCustomWidth(Math.max(240, Number(e.target.value || 0)))}
              placeholder="Width"
              aria-label="Custom width"
            />
            <span className="text-xs text-foreground/60">×</span>
            <input
              type="number"
              className="w-20 h-8 rounded-md border bg-background px-2 text-xs"
              value={customPreviewHeight}
              onChange={(e) => onChangeCustomHeight(Math.max(320, Number(e.target.value || 0)))}
              placeholder="Height"
              aria-label="Custom height"
            />
          </div>
        )}
      </div>

      <TooltipProvider delayDuration={1000}>
        <div className="hidden xl:flex items-center gap-1">
          {typeof showPreviewFrame === "boolean" && onTogglePreviewFrame && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn(
                    "h-8 w-8 rounded-md border bg-card inline-flex items-center justify-center cursor-pointer",
                    showPreviewFrame
                      ? "bg-green-400 dark:bg-green-900 hover:bg-accent dark:hover:bg-accent"
                      : "hover:bg-accent dark:hover:bg-accent"
                  )}
                  onClick={onTogglePreviewFrame}
                  aria-label={showPreviewFrame ? "Hide preview frame" : "Show preview frame"}
                >
                  {showPreviewFrame ? (
                    <CheckSquareIcon className="size-4 text-black dark:text-white" />
                  ) : (
                    <Square className="size-4 text-black dark:text-white" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showPreviewFrame ? "Hide preview frame" : "Show preview frame"}
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={cn(
                  "h-8 w-8 rounded-md border bg-card inline-flex items-center justify-center cursor-pointer",
                  selectionEnabled
                    ? "bg-green-400 dark:bg-green-900 hover:bg-accent dark:hover:bg-accent"
                    : "hover:bg-accent dark:hover:bg-accent"
                )}
                onClick={onToggleSelection}
                aria-label={selectionEnabled ? "Disable selection" : "Enable selection"}
              >
                <Crosshair className="size-4 text-black dark:text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {selectionEnabled ? "Disable selection" : "Enable selection"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={cn(
                  "h-8 w-8 rounded-md border bg-card inline-flex items-center justify-center hover:bg-accent cursor-pointer",
                  isSplitLocked
                    ? "bg-green-400 dark:bg-green-900 hover:bg-accent dark:hover:bg-accent"
                    : "hover:bg-accent dark:hover:bg-accent"
                )}
                onClick={onToggleSplitLock}
                aria-label={isSplitLocked ? "Unlock layout" : "Lock layout"}
              >
                {isSplitLocked ? (
                  <Lock className="size-4 text-black dark:text-white" />
                ) : (
                  <Unlock className="size-4 text-black dark:text-white" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isSplitLocked ? "Unlock layout" : "Lock layout"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={cn(
                  "h-8 w-8 rounded-md border bg-card inline-flex items-center justify-center cursor-pointer",
                  isSplitLocked
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-accent dark:hover:bg-accent"
                )}
                onClick={() => {
                  if (!isSplitLocked) onResetLayout();
                }}
                aria-label={isSplitLocked ? "Unlock layout to reset" : "Reset Layout"}
                disabled={isSplitLocked}
              >
                <RotateCcw className="size-4 text-black dark:text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isSplitLocked ? "Unlock layout to reset" : "Reset Layout"}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <div className="inline-flex items-center rounded-md border bg-card p-0.5 shrink-0">
        <button
          className={cn(
            "w-18 justify-center px-3 py-1.5 text-xs rounded-[6px] inline-flex items-center gap-1",
            activeTab === "ui"
              ? "bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
              : "text-foreground/60"
          )}
          onClick={() => onChangeTab("ui")}
        >
          <Eye className="size-4" /> UI
        </button>
        <button
          className={cn(
            "w-18 justify-center px-3 py-1.5 text-xs rounded-[6px] inline-flex items-center gap-1 cursor-pointer",
            activeTab === "code"
              ? "bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800"
              : "text-foreground/60"
          )}
          onClick={() => onChangeTab("code")}
        >
          <Code2 className="size-4" /> Code
        </button>
      </div>

      <Button
        variant="outline"
        className="inline-flex items-center gap-1 cursor-pointer shrink-0"
        onClick={onClickCopy}
      >
        {copyButtonText}
      </Button>

      <Button
        className={cn(
          "inline-flex items-center gap-1 cursor-pointer shrink-0",
          "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
        )}
        onClick={() => onClickSave && onClickSave()}
        aria-label="Save Changes"
        title="Save Changes"
      >
        Save Changes
      </Button>
    </div>
  );
}
