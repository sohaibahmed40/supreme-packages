"use client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function TruncatedCell({
  text,
  className = "",
}: {
  text: string | null | undefined;
  className?: string;
}) {
  if (!text) return <span className="text-muted-foreground">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`block truncate cursor-default ${className}`}>{text}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="whitespace-pre-wrap break-words">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}
