import { Button } from "@/components/ui/button";
import { Sparkle } from "lucide-react";
import { useWalletCopilot, SEGMENT_PROMPTS, type CopilotSegment } from "@/hooks/useWalletCopilot";

export const ExplainButton = ({
  segment,
  className,
}: {
  segment: CopilotSegment;
  className?: string;
}) => {
  const copilot = useWalletCopilot();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={`h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10 ${className ?? ""}`}
      onClick={() => copilot.open(segment, SEGMENT_PROMPTS[segment])}
      aria-label={`Explain ${segment} with Wallet Copilot`}
    >
      <Sparkle className="h-3.5 w-3.5" />
      Explain
    </Button>
  );
};
