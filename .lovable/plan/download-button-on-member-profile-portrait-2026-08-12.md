# Download Button on Member Profile Portrait

Add a small download button to the photo in the Member Profile Card so users can save their current portrait.

## What will change

- In `src/components/MemberProfileCard.tsx`, add a download action beside the existing "Change photo" button.
- The button is enabled only when a portrait photo is currently displayed.
- Clicking it fetches the currently displayed image (signed URL or public URL), creates a temporary blob `<a>` download, and suggests a filename like `ctt-member-portrait.jpg`.
- If the user has only the fallback initials avatar, the download button is disabled or hidden.
- Styling matches the existing small secondary button style and fits the card layout.

## Outcome

Jeremy Element's dashboard portrait will show both a "Change photo" and a "Download" button, and the same download action will appear for any user who has uploaded a portrait.
