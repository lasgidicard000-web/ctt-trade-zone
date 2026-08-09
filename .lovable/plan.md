# Make the webmail templates easy to find

## Where they are today

The 16 grouped starting points live in the **Compose** tab of Webmail, in the "Start from a template" dropdown — grouped as Account, Funds, Plans, Card, Security, Other. They are not on the Templates tab: that tab is only for your own custom templates saved in the database, so it looks empty until you create one.

Because everything sits inside one dropdown with a fixed max height, most of the list is below the fold and easy to miss on mobile.

## What changes

1. **Replace the dropdown with a visible template gallery** at the top of Compose:
   - Group headers (Account, Funds, Plans, Card, Security, Other) with the templates as tappable cards showing the label and a one-line summary of the subject.
   - A search box that filters templates by name and subject.
   - Collapsed by default to a single row of groups on mobile with a "Browse templates" toggle, so Compose still opens clean.
2. **Show a count** next to the toggle ("16 starting points + your saved templates") so it is obvious how many exist.
3. **Merge custom templates into the same gallery** under a "My templates" group at the top, keeping the existing variable-fill behaviour untouched.
4. **Templates tab gets a hint line** explaining that the built-in starting points are in Compose and this tab is for your own reusable templates.

## Guardrails kept

Selecting a template still just fills subject / heading / body / button fields, all editable, live preview unchanged. Sending, drafts, threading, and the variable guard are untouched.

## Technical notes

- All work in `src/components/webmail/Composer.tsx`: keep the existing `PRESETS` map and `applyPreset`, swap the `Select` block for a searchable gallery (Collapsible + grouped button grid), reusing `customTemplates` for the "My templates" group.
- One small copy addition in `src/components/webmail/TemplatesList.tsx` header description.
- No database, edge function, or email template changes.
