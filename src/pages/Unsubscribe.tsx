import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, MailX, XCircle } from "lucide-react";

type State = "loading" | "valid" | "already" | "invalid" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setState("invalid");
        return;
      }
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState("invalid");
          return;
        }
        setEmail(json.email ?? null);
        setState(json.used || json.already_unsubscribed ? "already" : "valid");
      } catch {
        setState("error");
      }
    };
    validate();
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    setSubmitting(false);
    setState(error ? "error" : "done");
  };

  return (
    <main className="container mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {state === "loading" ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : state === "done" || state === "already" ? (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            ) : state === "valid" ? (
              <MailX className="h-6 w-6 text-primary" />
            ) : (
              <XCircle className="h-6 w-6 text-destructive" />
            )}
          </div>
          <CardTitle>
            {state === "loading" && "Checking your link…"}
            {state === "valid" && "Unsubscribe from emails"}
            {state === "already" && "You're already unsubscribed"}
            {state === "done" && "You've been unsubscribed"}
            {state === "invalid" && "This link is no longer valid"}
            {state === "error" && "Something went wrong"}
          </CardTitle>
          <CardDescription>
            {state === "valid" &&
              `Confirm below to stop receiving emails${email ? ` at ${email}` : ""} from CTT Trade Zone.`}
            {state === "already" && "No further emails will be sent to this address."}
            {state === "done" && "We've removed this address from our mailing list."}
            {state === "invalid" &&
              "The unsubscribe link may have expired or already been used."}
            {state === "error" && "Please try again in a moment."}
          </CardDescription>
        </CardHeader>
        {state === "valid" && (
          <CardContent>
            <Button className="w-full" onClick={confirm} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm unsubscribe
            </Button>
          </CardContent>
        )}
      </Card>
    </main>
  );
}
