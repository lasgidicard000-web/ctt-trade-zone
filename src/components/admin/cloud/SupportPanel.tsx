import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Headphones, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

const TAWK_DASHBOARD = "https://dashboard.tawk.to/#/monitoring";

export const SupportPanel = () => {
  const openWidget = () => {
    const tawk = (window as any).Tawk_API;
    if (tawk?.maximize) {
      tawk.maximize();
    } else {
      toast.error("Live chat widget is still loading — try again in a moment.");
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Headphones className="h-4 w-4" /> Visitor monitoring
          </CardTitle>
          <CardDescription>
            Tawk.to tracks every visitor on the site in real time — pages viewed, location, device and live chats.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={TAWK_DASHBOARD} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" /> Open monitoring dashboard
            </a>
          </Button>
          <Button variant="outline" onClick={openWidget}>
            <MessageCircle className="mr-1.5 h-4 w-4" /> Open chat widget here
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" /> Support inboxes
          </CardTitle>
          <CardDescription>Follow up on chats over email from the admin webmail.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <div className="text-xs text-muted-foreground">Primary / spend card</div>
            <div className="font-mono text-xs">ctttradezone@caltexvault.com</div>
          </div>
          <div className="rounded-md bg-muted/40 px-3 py-2">
            <div className="text-xs text-muted-foreground">AGCSB / SafePal auth protocol</div>
            <div className="font-mono text-xs">agcsb@caltexvault.com</div>
          </div>
          <Button variant="outline" asChild className="w-full">
            <Link to="/admin/webmail">
              <Mail className="mr-1.5 h-4 w-4" /> Go to webmail
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportPanel;
