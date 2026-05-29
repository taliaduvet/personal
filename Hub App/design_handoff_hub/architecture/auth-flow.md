# Auth flow

Magic-link is the primary path. Google is offered as an option for users who prefer it.

## Magic link (primary)

1. User goes to `/sign-in`, types email, taps "send magic link"
2. Supabase sends an email with a one-tap link
3. User taps link → lands on `/auth/callback`
4. Supabase verifies the link, creates the session, sets a cookie
5. App redirects to `/` (or to `/welcome` if it's a new account)

## Google (optional)

1. User taps "sign in with Google" on `/sign-in`
2. Standard OAuth dance via Supabase
3. Same callback, same destination

## After first sign-in

- New account → `/welcome` (5 onboarding steps, see designs/Talia Hub Wireframes v3.html section 04)
- Returning account → `/` (the Hub home)

## What gets created on first sign-in

- A row in `public.users` (extends `auth.users`)
- `display_name` empty until set in onboarding
- `accent_color` defaults to violet `#9b6cff`
- No `ownership` rows yet — those land via Stripe webhooks after a purchase

## Session

- Supabase manages the session via a cookie
- Calls to Supabase from the Hub auto-attach the session
- Sign-out clears the cookie and revokes the refresh token

## Voice for the email

The magic-link email is the first impression. Write it in Talia's voice:

```
subject: your sign-in link · talia duvet

your link's below. it'll work for 15 minutes, then expire so it stays yours.

  [ sign in ]

if you didn't ask for this, just ignore it. nothing happens.

— talia duvet
```

(Customize the Supabase email template to match.)

## Cross-tool session sharing

Vein and Ledger should be able to read the Hub's session. The simplest way:

- Both apps point to the same Supabase project for auth
- The Hub sets a cookie scoped to `.taliaduvet.com` (so subdomains can read it)
- Vein at `vein.taliaduvet.com` and Ledger at `ledger.taliaduvet.com` reuse the session

If Vein or Ledger need to live on different domains (not subdomains), use Supabase's "issue session token" pattern: Hub issues a short-lived token, redirects to the tool with the token in the URL, the tool exchanges it for a session.

## Email delivery

Use Resend (or whatever Supabase's "custom SMTP" supports). Magic-link emails should arrive in under 30 seconds 99% of the time. If they don't, something's wrong — surface a calm message and a "resend" button on `/sign-in`.
