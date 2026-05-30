# Wheeltodo Beta Launch Guide

> **Who this is for:** The repo owner launching wheeltodo to beta testers for the first time.
> **What you need:** Access to the monorepo, a Supabase project, and (for mobile) Apple/Google developer accounts.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Setup](#2-environment-setup)
3. [Supabase Setup](#3-supabase-setup)
4. [Web App Beta Launch](#4-web-app-beta-launch)
5. [iOS Beta Launch (TestFlight)](#5-ios-beta-launch-testflight)
6. [Android Beta Launch (Play Store)](#6-android-beta-launch-play-store)
7. [Common Issues & Troubleshooting](#7-common-issues--troubleshooting)

---

## 1. Prerequisites

Install and configure all of the following before touching any build commands.

### Node.js & npm

The monorepo uses **npm workspaces** (root `package.json` defines `apps/*` and `packages/*`). There is no pnpm, Yarn, or Turborepo.

- **Node.js**: ≥ 18 recommended (Expo 55 and Next.js 16 both require it). Verify with `node -v`.
- **npm**: ≥ 9. Verify with `npm -v`.

### Expo CLI

The mobile app uses **Expo SDK 55** with the managed workflow.

```bash
npm install -g expo-cli
```

### EAS CLI

The `eas.json` requires **EAS CLI version ≥ 18.8.0**.

```bash
npm install -g eas-cli
eas --version   # confirm >= 18.8.0
```

Log in to your EAS account:

```bash
eas login
```

The EAS project is already registered in `app.json`:

- **EAS Project ID:** `58443556-af7a-48c3-adda-b6db805ec166`
- **EAS Owner:** `ionstudio`
- **Slug:** `wheeltodo`

If you're running under a different EAS account, update `expo.owner` and `expo.extra.eas.projectId` in `apps/mobile/app.json` and run `eas init` to re-register.

### Xcode (iOS builds only)

- **Xcode 15+** from the Mac App Store.
- After install, open Xcode once to accept the license and install command-line tools:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

- Ensure you have an **Apple Developer account** at https://developer.apple.com ($99/year). You need it for TestFlight.
- Your Apple Developer account must be added in Xcode under **Settings → Accounts**.

### Android Studio (Android builds only)

- **Android Studio Meerkat (2024.3) or later**.
- During setup, install **Android SDK**, **Android Virtual Device (AVD)**, and set `ANDROID_HOME`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk     # macOS
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Add the above to your shell profile (`.zshrc` or `.bash_profile`).

- You need a **Google Play Console account** at https://play.google.com/console ($25 one-time). You need it to publish to internal testing.

### Supabase Account

- Create a project at https://supabase.com (free tier is fine for beta).
- Note your **Project URL** and **anon/public API key** from **Project Settings → API**.

### Vercel Account (for web deployment)

- Create an account at https://vercel.com (free tier is fine).
- Install the Vercel CLI if you want to deploy from the command line:

```bash
npm install -g vercel
```

---

## 2. Environment Setup

### Install all dependencies from the monorepo root first

```bash
# From the repo root (wheeltodo/)
npm install
```

This installs deps for all workspaces: `apps/web`, `apps/mobile`, and `packages/shared`.

---

### Web app: `apps/web/.env.local`

Create the file `apps/web/.env.local` (not committed to git). It must contain:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

**Where to get the values:**
- Go to your Supabase project → **Project Settings → API**.
- `NEXT_PUBLIC_SUPABASE_URL` → "Project URL"
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → "Project API keys → anon (public)"

> **Note:** The `packages/shared/src/supabase.ts` validates these with Zod and will throw a `ZodError` at runtime if either is missing or malformed (not a valid URL, or empty string). The web app wraps this in a `try/catch` in `page.tsx` — if the env vars are absent it falls back to unauthenticated mode, so auth won't work but the app will load. Don't rely on this fallback in production; always set the vars.

---

### Mobile app: `apps/mobile/.env`

Create the file `apps/mobile/.env`. It must contain:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Same values as above — the same Supabase project is used for both platforms.

> **Critical for EAS cloud builds:** Local `.env` files are **not** uploaded to EAS build servers. You must also add these as EAS secrets so cloud builds can access them.

### Add EAS secrets for mobile cloud builds

```bash
cd apps/mobile

eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://<your-project-ref>.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<your-supabase-anon-key>"
```

Verify they were saved:

```bash
eas secret:list
```

---

### Backend-only secrets (server use only)

If you later add Supabase Edge Functions or a backend service, you'll need `.env.server` (gitignored). See `.env.server.example` at the repo root:

```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # or SUPABASE_SECRET_KEY for newer projects
```

These should **never** go in client-side code (`NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`).

---

## 3. Supabase Setup

Everything below is done in your Supabase project dashboard at https://supabase.com/dashboard.

### Step 1: Enable Email Auth

1. Go to **Authentication → Providers**.
2. Ensure **Email** is enabled.
3. Under "Email Auth" settings:
   - **Confirm email**: Enable this so new users get a verification email (the `VerifyEmailScreen` component in the web app expects this flow).
   - **Secure email change**: Enabled by default — leave it on.

### Step 2: Configure redirect URLs (critical for email verification)

When Supabase sends a verification or password-reset email, it redirects to a URL after the user clicks the link. You must whitelist all URLs your app will use.

1. Go to **Authentication → URL Configuration**.
2. Under **Redirect URLs**, add:

```
# Web (local dev)
http://localhost:3000

# Web (production — replace with your actual Vercel URL)
https://wheeltodo.vercel.app

# Web (any custom domain you add later)
https://yourdomain.com
```

3. Set the **Site URL** to your production web URL (e.g. `https://wheeltodo.vercel.app`). This is the default redirect when no explicit redirect is specified.

> **Common mistake:** If you forget to add the production URL here, email verification links will fail in production with a "redirect_uri mismatch" error even if local dev works fine.

### Step 3: Email templates (optional but recommended for beta)

1. Go to **Authentication → Email Templates**.
2. Customise the "Confirm signup" template to match the Wheeltodo brand. The subject and body can reference `{{ .ConfirmationURL }}`.

### Step 4: No database tables needed (for current version)

As of the current codebase, **the app stores all task/rest/history data in `localStorage` (web) and `AsyncStorage` (mobile)**. Supabase is only used for authentication. You do not need to create any database tables, run any migrations, or configure row-level security for the beta.

---

## 4. Web App Beta Launch

### Local development

```bash
# From the repo root
npm run dev:web

# Or from apps/web directly
cd apps/web
npm run dev
```

Opens at http://localhost:3000. Hot reload is enabled.

### Production build (verify before deploying)

```bash
# From the repo root
npm run build -w apps/web

# Or from apps/web directly
cd apps/web
npm run build
```

This runs `next build`. If it fails, it's almost always a TypeScript error or a missing env var. Check the output carefully.

To run the production build locally:

```bash
cd apps/web
npm run start
```

### Deploy to Vercel

**Option A — Vercel dashboard (recommended for first deploy):**

1. Push the repo to GitHub.
2. Go to https://vercel.com/new and import the repo.
3. In the project configuration:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && npm install && cd apps/web && npm run build` — or simply let Vercel use `next build` with Root Directory set to `apps/web`. Vercel handles monorepos well but you may need to set the root directory explicitly.
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**.

**Option B — Vercel CLI:**

```bash
cd apps/web
vercel --prod
```

Follow the prompts. When asked for the root directory, confirm it is `apps/web`.

After deploying, add the Vercel URL to your Supabase redirect URLs (step 3 above).

### Sharing with beta testers

The web app has no invite-only gate in the current codebase. Simply share the Vercel URL. Anyone who visits can sign up with their email via the Supabase auth flow. If you want to restrict access, add an allowlist in Supabase under **Authentication → Policies**, or add a simple invite-code check in the SignUpForm component.

---

## 5. iOS Beta Launch (TestFlight)

### What you'll need before starting

- Apple Developer account enrolled in the Apple Developer Program ($99/year).
- An app record created in App Store Connect at https://appstoreconnect.apple.com:
  - Go to **My Apps → +** → **New App**.
  - Platform: iOS.
  - Bundle ID: `com.ionstudio.wheeltodo` (must match `app.json`).
  - Name: `wheeltodo` (or your display name).
  - SKU: any unique string (e.g. `wheeltodo-001`).

### Step 1: Configure `app.json` (review before building)

Confirm the following in `apps/mobile/app.json`:

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.ionstudio.wheeltodo"
}
```

If you need to change the bundle ID (e.g. if `ionstudio` is not your Apple Team identifier space), update it here and in App Store Connect to match.

### Step 2: Configure EAS credentials

EAS will manage provisioning profiles and signing certificates. Run this once:

```bash
cd apps/mobile
eas credentials --platform ios
```

Select **"Expo Go (Managed)? No, I'll use my own credentials"** if you want control, or let EAS handle everything automatically (recommended for first-time setup).

### Step 3: Run a local dev build (optional, sanity check)

Before spending build minutes on a cloud build, verify the app runs locally on a simulator:

```bash
cd apps/mobile
npx expo start          # starts Metro bundler
```

Then press `i` to open in the iOS Simulator (requires Xcode).

For a device build using your dev client:

```bash
npm run build:dev -w apps/mobile
# equivalent to: eas build --profile development
```

This builds an IPA that includes the Expo dev client. Install it on a device via the EAS dashboard link or QR code.

### Step 4: Build for TestFlight (production profile)

The `production` profile in `eas.json` builds a store-ready IPA with `autoIncrement: true` (EAS manages the version number remotely).

```bash
cd apps/mobile
npm run build:prod -- --platform ios
# equivalent to: eas build --profile production --platform ios
```

- The build runs in the EAS cloud. Monitor it at https://expo.dev or watch the CLI output.
- Build typically takes 10–20 minutes.
- When complete, you can download the `.ipa` from the EAS dashboard.

### Step 5: Submit to TestFlight

```bash
cd apps/mobile
npm run submit:ios
# equivalent to: eas submit --platform ios
```

EAS will prompt for your App Store Connect API key (recommended) or Apple ID credentials. To set up an API key:

1. Go to App Store Connect → **Users and Access → Keys**.
2. Create a key with **App Manager** role.
3. Download the `.p8` file.
4. Run: `eas submit --platform ios` and provide the key ID, issuer ID, and path to the `.p8` file when prompted.

EAS submits the binary to TestFlight automatically.

### Step 6: Invite beta testers

1. In App Store Connect, go to your app → **TestFlight**.
2. Wait for the build to finish processing (usually 5–15 minutes after submission).
3. Under **Internal Testing**: Add up to 100 internal testers by Apple ID. They get immediate access.
4. Under **External Testing**: Create a test group, add testers by email, and submit for Beta App Review (usually takes < 24h). External testing supports up to 10,000 testers.

Testers will receive an email with a TestFlight link. They install the TestFlight app from the App Store, then install Wheeltodo from within TestFlight.

---

## 6. Android Beta Launch (Play Store)

### What you'll need before starting

- Google Play Console account ($25 one-time at https://play.google.com/console).
- An app created in the Play Console:
  - Go to **All apps → Create app**.
  - App name: `wheeltodo`, Default language, App or Game → App, Free or Paid.
  - Complete the mandatory setup tasks shown in the dashboard.

### Step 1: Confirm `app.json` Android config

```json
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#ffffff"
  },
  "predictiveBackGestureEnabled": false,
  "package": "com.ionstudio.wheeltodo"
}
```

The `package` field must match what you registered in the Play Console. If you're using a different namespace, update both here and in the Play Console.

### Step 2: Set up EAS credentials for Android

```bash
cd apps/mobile
eas credentials --platform android
```

EAS can generate and manage a keystore for you (recommended). If you already have a keystore, provide it here. Store the keystore safely — you cannot change it after the first upload without creating a new app in the Play Console.

### Step 3: Run a local Android build (optional, sanity check)

```bash
cd apps/mobile
npx expo start          # start Metro
```

Press `a` to open in the Android Emulator (requires Android Studio with an AVD configured).

### Step 4: Build for Play Store (production profile)

```bash
cd apps/mobile
npm run build:prod -- --platform android
# equivalent to: eas build --profile production --platform android
```

This builds an **AAB (Android App Bundle)**, which is required by the Play Store. EAS automatically produces AAB for the production profile.

Monitor the build at https://expo.dev. Build takes roughly 10–15 minutes.

### Step 5: Submit to Google Play internal testing

```bash
cd apps/mobile
npm run submit:android
# equivalent to: eas submit --platform android
```

EAS will ask for a Google Service Account key JSON file. To create one:

1. Go to Google Play Console → **Setup → API access**.
2. Link to a Google Cloud project (or create one).
3. Click **Create new service account** → follow the link to Google Cloud Console.
4. Create a service account, grant it the **Release Manager** role.
5. Create and download a JSON key.
6. Back in Play Console, grant the service account access to your app.

Provide the path to the JSON key when EAS prompts you, or set it permanently:

```bash
eas secret:create --scope project --name EXPO_GOOGLE_SERVICE_ACCOUNT_KEY_JSON --value "$(cat /path/to/key.json)"
```

Or pass it inline:

```bash
eas submit --platform android --service-account-key-path /path/to/key.json
```

### Step 6: Invite beta testers

1. In Play Console, go to your app → **Testing → Internal testing**.
2. The build submitted by EAS will appear here.
3. Click **Promote to internal testing** (or it may auto-promote depending on your setup).
4. Go to **Testers** tab → **Create email list**, add tester email addresses.
5. Share the opt-in URL shown in the dashboard with testers.

Testers click the link, opt in to the test, then install from the Play Store like a normal app. Internal testing is instant (no review required).

---

## 7. Common Issues & Troubleshooting

### Supabase env vars cause a ZodError crash

`packages/shared/src/supabase.ts` uses Zod to validate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. If either is missing or the URL is malformed, it throws at the call to `getSupabaseClient()`. On the web, `page.tsx` wraps this in a `try/catch` so the app loads without auth — but users can't sign in.

**Fix:** Double-check your `apps/web/.env.local` file has both variables set to valid values. The URL must be a full HTTPS URL (e.g. `https://abcxyz.supabase.co`), not just the project ref.

---

### EAS build fails with "project not found" or "owner mismatch"

`app.json` has `"owner": "ionstudio"` and a specific `projectId`. If your EAS account is not `ionstudio`, the build will fail.

**Fix:** Update `app.json`:

```json
"owner": "<your-eas-username>",
"extra": {
  "eas": {
    "projectId": "<new-project-id-from-eas-init>"
  }
}
```

Then re-run:

```bash
cd apps/mobile
eas init
```

---

### `appVersionSource: "remote"` — build version not incrementing as expected

`eas.json` sets `"appVersionSource": "remote"`, which means EAS manages the version number in the cloud, not from `app.json`. The production profile also has `"autoIncrement": true`.

**Implication:** Do **not** manually bump `version` in `app.json` for production builds. EAS handles it. If you need to force a specific version, you can override via:

```bash
eas build --profile production --platform ios --build-version "1.0.1"
```

---

### Email verification redirect doesn't work in production

After a user signs up, Supabase sends a confirmation email with a link that redirects to your app. If the redirect URL isn't whitelisted in Supabase, you'll see a "redirect_uri not allowed" error.

**Fix:** In Supabase → **Authentication → URL Configuration**, add your exact production URL to the **Redirect URLs** list. Also verify **Site URL** is set to your production domain. Local dev (`localhost:3000`) needs to be listed separately.

---

### iOS: `pod install` fails or native module errors

The mobile app uses Expo SDK 55 with React Native 0.83.6. If you ever run a local native build (`expo run:ios`), CocoaPods must be installed:

```bash
sudo gem install cocoapods
```

Then from `apps/mobile/ios`:

```bash
pod install --repo-update
```

If you see errors about `expo-dev-client` or `expo-modules-core`, try:

```bash
cd apps/mobile
npx expo install --check    # auto-fix Expo package versions
```

---

### Android: Emulator won't start or `ANDROID_HOME` not found

If `expo start` can't find Android SDK:

```bash
# Confirm path (macOS default)
ls $ANDROID_HOME/platform-tools/adb

# If missing, set it manually
export ANDROID_HOME=$HOME/Library/Android/sdk
```

Open Android Studio → **Device Manager**, create an AVD if none exists, then press `a` in the Expo CLI.

---

### `@todo/shared` package not resolving in web or mobile

The shared package is linked via `"@todo/shared": "file:../../packages/shared"` in both `apps/web/package.json` and `apps/mobile/package.json`. It only works if you `npm install` from the **monorepo root**, not from within a workspace subdirectory.

```bash
# CORRECT — always run this from the repo root
npm install

# WRONG — will not link workspaces correctly
cd apps/web && npm install
```

Next.js is configured in `next.config.ts` to transpile the shared package with `transpilePackages: ["@todo/shared"]`. If you see module resolution errors on the web side, confirm this is present.

---

### EAS build uses stale Supabase env vars

If you change your Supabase keys after setting EAS secrets, the old secrets won't update automatically.

**Fix:**

```bash
eas secret:list     # confirm current values
eas secret:delete --name EXPO_PUBLIC_SUPABASE_URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
```

---

### Preview build vs. Production build confusion

The `eas.json` has three profiles:

- **`development`**: Includes the Expo dev client. For internal dev testing only — not for beta testers.
- **`preview`**: `distribution: "internal"` — produces a direct-install IPA/APK. Good for small internal groups who can sideload. **Not** TestFlight or Play Store.
- **`production`**: Produces a store-ready IPA/AAB. Use this for TestFlight and Google Play internal testing.

For a public or semi-public beta, always use the `production` profile and the `eas submit` command.
