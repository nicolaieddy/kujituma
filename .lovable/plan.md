

# Set Up Capacitor for Native iOS App

## What This Does
This configures your project so you can build a real native iOS app from your existing web app and submit it to the Apple App Store.

## What I'll Do (In Lovable)

1. **Install Capacitor packages** -- Add the required dependencies: `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, and `@capacitor/android`
2. **Create Capacitor config file** (`capacitor.config.ts`) with:
   - App ID: `app.lovable.b825602865f1489caa7848f27fdddc06`
   - App name: `kujituma`
   - Live-reload server URL pointing to your preview so you can test instantly on your phone

## What You'll Do (On Your Mac)

After I make the changes, you'll need to:

1. **Export to GitHub** -- Click the GitHub button in Lovable to push your code to a repository
2. **Clone and set up** -- On your Mac, open Terminal and run:
   ```
   git clone <your-repo-url>
   cd <your-project>
   npm install
   npx cap add ios
   npm run build
   npx cap sync
   ```
3. **Open in Xcode** -- Run `npx cap open ios`, then hit the Play button to run on your iPhone or simulator
4. **Submit to App Store** -- When ready, use Xcode to archive and upload to App Store Connect

## Requirements
- A Mac with Xcode installed (free from the Mac App Store)
- An Apple Developer Account ($99/year) for App Store submission
- An iPhone or use the Xcode Simulator for testing

## Ongoing Updates
Whenever you make changes in Lovable, just pull the latest code on your Mac and run `npx cap sync` to update the native app.

## Technical Details

**Files created/modified:**
- `capacitor.config.ts` -- New file with app configuration and live-reload server settings
- `package.json` -- Add `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` as dependencies

**Reference:** After setup, I'll share a link to the Lovable blog post with a full walkthrough of the Capacitor workflow.

