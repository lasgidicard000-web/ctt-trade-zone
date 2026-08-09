import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2, Save } from "lucide-react";
import { buildPreviewHtml } from "./emailPreview";
import {
  AUTO_VARS,
  TEMPLATE_GROUPS,
  applyVars,
  autoValues,
  extractVars,
  type MailTemplate,
  type TemplateVar,
} from "./templateVars";

interface Props {
  template: MailTemplate | null;
  userId: string | null;
  onDone: () => void;
  onCancel: () => void;
}

export default function TemplateEditor({ template, userId, onDone, onCancel }: Props) {
  const [name, setName] = useState(template?.name ?? "");
  const [group, setGroup] = useState(template?.group_label ?? "Other");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [heading, setHeading] = useState(template?.heading ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [buttonLabel, setButtonLabel] = useState(template?.button_label ?? "");
  const [buttonUrl, setButtonUrl] = useState(template?.button_url ?? "");
  const [defaults, setDefaults] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    (template?.variables ?? []).forEach((v) => {
      if (v?.key) map[v.key] = v.default ?? "";
    });
    return map;
  });
  const [saving, setSaving] = useState(false);

  const vars = useMemo(
    () => extractVars([subject, heading, body, buttonLabel, buttonUrl]),
    [subject, heading, body, buttonLabel, buttonUrl]
  );

  // Keep the defaults map in sync as variables appear or disappear.
  useEffect(() => {
    setDefaults((prev) => {
      const next: Record<string, string> = {};
      vars.forEach((k) => {
        next[k] = prev[k] ?? "";
      });
      return next;
    });
  }, [vars]);

  const previewValues = useMemo(
    () => ({
      ...autoValues({ recipientName: "Jeremy", recipientEmail: "user@example.com" }),
      ...Object.fromEntries(
        Object.entries(defaults).filter(([, v]) => v.trim() !== "")
      ),
    }),
    [defaults]
  );

  const previewHtml = useMemo(
    () =>
      buildPreviewHtml({
        heading: applyVars(heading, previewValues),
        subject: applyVars(subject, previewValues),
        recipientName: "Jeremy",
        body: applyVars(body, previewValues),
        buttonLabel: applyVars(buttonLabel, previewValues),
        buttonUrl: applyVars(buttonUrl, previewValues),
      }),
    [heading, subject, body, buttonLabel, buttonUrl, previewValues]
  );

  const insertVar = (key: string) => {
    setBody((b) => `${b}{{${key}}}`);
  };

  const payload = () => ({
    name: name.trim(),
    group_label: group,
    subject: subject.trim(),
    heading: heading.trim() || null,
    body,
    button_label: buttonLabel.trim() || null,
    button_url: buttonUrl.trim() || null,
    variables: vars.map<TemplateVar>((k) => ({ key: k, default: defaults[k] ?? "" })),
    created_by: userId,
  });

  const canSave = name.trim().length > 0 && body.trim().length > 0;

  const save = async (asNew: boolean) => {
    if (!canSave) return;
    setSaving(true);
    let error;
    if (template && !asNew) {
      ({ error } = await supabase
        .from("mail_templates" as any)
        .update(payload() as any)
        .eq("id", template.id));
    } else {
      ({ error } = await supabase.from("mail_templates" as any).insert(payload() as any));
    }
    setSaving(false);
    if (error) {
      toast.error("Could not save the template. Please try again.");
      return;
    }
    toast.success(template && !asNew ? "Template updated" : "Template saved");
    onDone();
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onCancel}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to templates
      </Button>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{template ? "Edit template" : "New template"}</CardTitle>
            <CardDescription>
              Use <code>{"{{variable}}"}</code> anywhere — you fill the values when
              composing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tpl-name">Template name</Label>
                <Input
                  id="tpl-name"
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Deposit credited"
                />
              </div>
              <div className="grid gap-2">
                <Label>Group</Label>
                <Select value={group} onValueChange={setGroup}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tpl-subject">Subject</Label>
              <Input
                id="tpl-subject"
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Your {{plan_name}} plan is active"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tpl-heading">Heading in email (optional)</Label>
              <Input
                id="tpl-heading"
                maxLength={200}
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="Defaults to the subject"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tpl-body">Message</Label>
              <Textarea
                id="tpl-body"
                rows={10}
                maxLength={8000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={"Hi {{recipient_name}},\n\nWe credited {{amount}} to your wallet on {{today}}."}
              />
              <p className="text-xs text-muted-foreground">{body.length}/8000 characters</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="tpl-btn">Button label (optional)</Label>
                <Input
                  id="tpl-btn"
                  maxLength={60}
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  placeholder="Open your wallet"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tpl-url">Button link (optional)</Label>
                <Input
                  id="tpl-url"
                  maxLength={500}
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder="https://ctttradezone.com/wallet"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" disabled={!canSave || saving} onClick={() => save(false)}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {template ? "Save changes" : "Save template"}
              </Button>
              {template ? (
                <Button variant="outline" disabled={!canSave || saving} onClick={() => save(true)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Save as new
                </Button>
              ) : null}
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Variables</CardTitle>
              <CardDescription>
                Detected automatically from your text. Give optional defaults so the
                composer pre-fills them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {AUTO_VARS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => insertVar(k)}
                    className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium transition-colors hover:bg-accent"
                  >
                    {`{{${k}}}`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Those four fill in automatically at send time. Click to insert into the
                message.
              </p>

              {vars.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No variables in this template yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {vars.map((k) => {
                    const auto = (AUTO_VARS as readonly string[]).includes(k);
                    return (
                      <div key={k} className="grid gap-2">
                        <Label className="flex items-center gap-2 text-xs">
                          <code>{`{{${k}}}`}</code>
                          {auto ? (
                            <Badge variant="secondary" className="text-[10px]">
                              auto
                            </Badge>
                          ) : null}
                        </Label>
                        <Input
                          value={defaults[k] ?? ""}
                          maxLength={200}
                          disabled={auto}
                          onChange={(e) =>
                            setDefaults((prev) => ({ ...prev, [k]: e.target.value }))
                          }
                          placeholder={auto ? "Filled automatically" : "Default value (optional)"}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Sample values shown for variables.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border border-border bg-white">
                <iframe
                  title="Template preview"
                  srcDoc={previewHtml}
                  className="h-[420px] w-full"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
