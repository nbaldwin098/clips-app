# Clips for iPhone

**Maintain or archive:** This `ios/` folder is a thin WKWebView shell that loads **https://calabi.us**. It is **not** a separate native feature app. Keep it if you still plan App Store distribution of the web shell; otherwise archive/remove when the empty `nbaldwin098/app` repo (or a real native rewrite) supersedes it. Do not treat `ios/` as required for web deploys.

This is the **iOS app for [calabi.us](https://calabi.us)**. It opens the live website. It is not a second copy of the product codebase.

It belongs in **https://github.com/nbaldwin098/app** (empty repo you created). This machine could not write to that GitHub repo, so the project also lives here under `ios/` until you copy it or add GitHub write access.

It is **not** on the App Store yet. That needs your Apple Developer account and a Mac.

## What it is (honest)

- Native iPhone/iPad shell (Swift)
- Loads **https://calabi.us**
- Camera / mic / photos are requested so upload on the site can work
- Live ingest is still not connected on the website
- Apple’s **Sign in with Apple** button on the website may fail inside the in-app browser. Email/password still works

## Open it on a Mac

1. Install **Xcode** from the Mac App Store
2. If you are in this clips-app folder, double-click **ios/Clips.xcodeproj**
3. If you copied files into the `app` repo, double-click **Clips.xcodeproj** at the root
4. Pick **Clips** and your iPhone (or Simulator)
5. Click Play
6. First time: Xcode → Settings → Accounts → add your Apple ID

You do not need to run git commands.

## App Store later

Apple Developer Program, bundle id `us.calabi.clips` (change it if Apple says taken), then Archive → Upload.

## Site URL

Edit `Clips/Site.swift` if the site address ever changes.
