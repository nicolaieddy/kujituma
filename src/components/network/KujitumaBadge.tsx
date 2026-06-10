import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { KujitumaMatch } from "@/hooks/network/useKujitumaMatches";

interface Props {
  match: KujitumaMatch;
  size?: "sm" | "md";
  className?: string;
}

const matchLabel = (matchedOn: KujitumaMatch["matchedOn"]) => {
  const names = matchedOn.map((m) =>
    m === "email" ? "email" : m === "linkedin" ? "LinkedIn" : "phone"
  );
  return `Matched on ${names.join(", ")}`;
};

export const KujitumaBadge = ({ match, size = "sm", className }: Props) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (match.isPartner && match.partnershipId) {
      navigate(`/partner/${match.userId}`);
    } else {
      navigate(`/profile/${match.userId}`);
    }
  };

  const label = match.isPartner ? "Partner" : "On Kujituma";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border font-medium transition-colors",
              "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20",
              size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
              className
            )}
            aria-label={`${label} — open profile`}
          >
            <Sparkles className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {match.fullName ? `${match.fullName} is on Kujituma` : "This contact is on Kujituma"}
          <div className="text-muted-foreground">{matchLabel(match.matchedOn)}</div>
          <div className="text-muted-foreground mt-0.5">
            Click to open {match.isPartner ? "partner dashboard" : "profile"}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
