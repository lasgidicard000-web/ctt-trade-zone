# Custom webmail template editor

Let you create, edit and save your own webmail templates — stored in the backend, shared across admins, and usable from the composer just like the built-in ones.

## What you get

1. **New "Templates" tab** on the Webmail page, next to Compose / Inbox / Outbox / Drafts.
   - List of your saved templates with name, group, subject and last-updated time.
   - Actions per template: Edit, Duplicate, Delete.
   - "New template" opens the editor.
2. **Template editor** with: name, group (Account, Funds, Plans, Card, Security, Other, or a custom label), subject, optional email heading, body, optional button label and button URL.
   - Live branded preview of the email as it will look, updating as you type.
   - Save / Save as new / Cancel.
3. **Variables**
   - Insert placeholders anywhere in subject, heading, body, button label or URL using `{{name}}` syntax.
   - Built-in variables filled automatically at send time: `{{recipient_name}}`, `{{recipient_email}}`, `{{today}}`, `{{sender_name}}`.
   - Any other `{{...}}` you invent (e.g. `{{amount}}`, `{{plan_name}}`) becomes a custom variable. A "Variables" panel in the editor lists every variable detected in the template, with an optional default value and a click-to-insert chip list.
4. **Using a template in Compose**
   - The template picker gains a "My templates" group above the built-in groups.
   - Picking a custom template fills the composer fields and shows a small "Fill variables" form — one input per detected variable, pre-filled with defaults and with `{{recipient_name}}` / `{{recipient_email}}` auto-resolved from the selected recipient.
   - Values are substituted into the live preview and into the final send, so nothing with unreplaced `{{...}}` can be sent — sending is blocked with a clear message listing the unfilled variables.

## Guardrails kept

Still one recipient per send, still account/support mail only. Built-in presets stay as they are and remain untouched; custom templates live alongside them.

## Technical notes

- New table `mail_templates`: `id`, `name`, `group_label`, `subject`, `heading`, `body`, `button_label`, `button_url`, `variables` (jsonb — array of `{ key, default }`), `created_by`, `created_at`, `updated_at`. GRANTs for `authenticated` + `service_role`, RLS restricted to `has_role(auth.uid(), 'admin')` for all operations, plus the standard `updated_at` trigger.
- New `src/components/webmail/TemplatesList.tsx` (list + delete/duplicate) and `src/components/webmail/TemplateEditor.tsx` (form, variable detection, live preview reusing the composer's preview markup).
- Variable handling in a small shared helper `src/components/webmail/templateVars.ts`: `extractVars(...)` scans all fields for `{{key}}`, `applyVars(text, values)` substitutes, `findUnfilled(...)` powers the send guard.
- `Composer.tsx`: load custom templates from `mail_templates`, render them in a "My templates" `SelectGroup`, and add the variable-fill form; substitution happens before building the preview and before the `admin-send-email` invoke payload.
- `AdminWebmail.tsx`: add the Templates tab and wire refresh keys so saving a template refreshes the composer's picker.
- No changes to the email template, `admin-send-email`, or the send pipeline — substitution happens client-side before send, so no function redeploy is needed.
