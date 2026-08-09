import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bot, Copy, Eraser, Loader2, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  WalletCopilotContext,
  GENERAL_SUGGESTIONS,
  type CopilotSegment,
} from "@/hooks/useWalletCopilot";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi — I'm your **Wallet Copilot**. I can break down anything on this dashboard using your live figures: your CTT debit card, portfolio, active plan and daily ROI, deposits, withdrawals and referrals. Tap a suggestion or ask me anything.",
};

export const WalletCopilotProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [segment, setSegment] = useState<CopilotSegment | null>(null);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<string | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const send = useCallback(
    async (text: string, seg: CopilotSegment | null) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;
      const history = [...messages.filter((m) => m !== GREETING), { role: "user" as const, content: trimmed }];
      setMessages((m) => [...m, { role: "user", content: trimmed }]);
      setInput("");
      setStreaming(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Please sign in again to use the copilot.");

        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-copilot`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ messages: history, segment: seg }),
          },
        );

        if (!resp.ok || !resp.body) {
          const detail = await resp.json().catch(() => ({}));
          const msg =
            resp.status === 429
              ? "Rate limit reached — try again in a moment."
              : resp.status === 402
              ? "AI credits are exhausted. Please contact support."
              : (detail as any)?.error || "The copilot could not answer right now.";
          throw new Error(msg);
        }

        setMessages((m) => [...m, { role: "assistant", content: "" }]);
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;

        while (!done) {
          const { value, done: finished } = await reader.read();
          if (finished) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") {
              done = true;
              break;
            }
            try {
              const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
              if (delta) {
                setMessages((m) => {
                  const next = [...m];
                  next[next.length - 1] = {
                    role: "assistant",
                    content: next[next.length - 1].content + delta,
                  };
                  return next;
                });
              }
            } catch {
              // partial JSON chunk — ignore
            }
          }
        }
      } catch (e) {
        setInput(trimmed);
        setMessages((m) => (m[m.length - 1]?.content === "" ? m.slice(0, -1) : m));
        toast.error(e instanceof Error ? e.message : "Copilot failed");
      } finally {
        setStreaming(false);
        inputRef.current?.focus();
      }
    },
    [messages, streaming],
  );

  // Consume a queued prompt once the panel is open.
  useEffect(() => {
    if (open && pendingRef.current) {
      const prompt = pendingRef.current;
      pendingRef.current = null;
      void send(prompt, segment);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const api = {
    open: (seg?: CopilotSegment, prompt?: string) => {
      setSegment(seg ?? null);
      if (prompt) pendingRef.current = prompt;
      setOpen(true);
    },
  };

  return (
    <WalletCopilotContext.Provider value={api}>
      {children}

      {!open && (
        <Button
          ref={launcherRef}
          onPointerDown={onLauncherPointerDown}
          onClick={() => {
            if (draggedRef.current) return;
            api.open();
          }}
          size="lg"
          style={
            pos
              ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
              : undefined
          }
          className="fixed bottom-5 left-5 z-40 touch-none gap-2 rounded-full shadow-lg shadow-primary/30 active:cursor-grabbing"
          title="Drag to reposition"
        >
          <Sparkles className="h-5 w-5" />
          <span className="hidden sm:inline">Wallet Copilot</span>
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border p-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <span className="inline-flex rounded-full bg-primary/10 p-1.5">
                <Bot className="h-4 w-4 text-primary" />
              </span>
              Wallet Copilot
            </SheetTitle>
            <div className="mt-1 flex items-center gap-2">
              {segment ? (
                <Badge variant="outline" className="border-primary/40 text-primary">
                  {segment}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Grounded in your live wallet data
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto h-7 px-2 text-xs"
                onClick={() => {
                  setMessages([GREETING]);
                  setSegment(null);
                }}
              >
                <Eraser className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 py-4">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                  {m.role === "user" ? (
                    <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                      {m.content}
                    </p>
                  ) : (
                    <div className="group">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground [&_li]:my-0.5 [&_p]:my-1.5 [&_strong]:text-foreground">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                      {m.content && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-1.5 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => {
                            navigator.clipboard.writeText(m.content);
                            toast.success("Copied");
                          }}
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          Copy
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {streaming && messages[messages.length - 1]?.content === "" && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Reading your wallet…
                </p>
              )}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-border p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {GENERAL_SUGGESTIONS.slice(0, 4).map((s) => (
                <button
                  key={s.label}
                  type="button"
                  disabled={streaming}
                  onClick={() => send(s.prompt, segment)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input, segment);
              }}
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about any part of your wallet…"
                disabled={streaming}
              />
              <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <p className="mt-2 text-[10px] leading-tight text-muted-foreground">
              Copilot is advisory only — it never moves funds and never shows full card
              number, expiry, CVV or PIN.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </WalletCopilotContext.Provider>
  );
};
