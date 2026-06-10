# Review Questions

Things to decide before considering this branch done.

- **"Get Premium" button** — it currently just closes the pricing page. Is there a payment flow planned (Stripe, etc.), or should the button be removed / replaced with a "Contact" or waitlist link? Right now clicking it does nothing visible to the user, which looks broken.

- **Delete/clear confirmations** — both "Delete entry" and "Clear all history" use the browser's native `confirm()` dialog, which looks inconsistent with the rest of the UI. Worth replacing with an inline confirmation (e.g. a small "Are you sure? Yes / Cancel" inline prompt on the button) for a more polished feel. Happy to implement if you want this.

- **`openai==0.28.0`** — this is a very old release (2023). The current openai Python SDK is v1.x+ and the API style changed significantly (`openai.ChatCompletion.create` → `client.chat.completions.create`). If you plan to add features or update dependencies, this will need a migration. Not urgent if it's working.

- **Dark mode on auth pages** — Login and Register pages use a mix of Tailwind `dark:` variants and manual `isDark ?` ternary logic. It works, but it's inconsistent. Worth unifying to just Tailwind dark variants if you refactor those pages.
