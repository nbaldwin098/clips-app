# Clips for iPhone

This is the **iOS app for [calabi.us](https://calabi.us)**. It is a real iPhone app that opens the live Clips website. It is not a fake second copy of the site.

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


This is the **iOS app for [calabi.us](https://calabi.us)**. It is a real iPhone app that opens the live Clips website (dark player, clips, pics, sign-in). It is not a fake second copy of the site.

It is **not** on the App Store yet. That needs your Apple Developer account and a Mac.

## What it is (honest)

- Native iPhone/iPad shell (Swift)
- Loads **https://calabi.us**
- Camera / mic / photos are requested so upload on the site can work
- Live ingest is still not connected on the website, so it will not magically go live from the phone either
- Apple’s **Sign in with Apple** button on the website may fail inside the in-app browser. Email/password still works. A native Apple button can be added later

## Open it on a Mac

1. Install **Xcode** from the Mac App Store
2. Download this repo
3. Double-click **Clips.xcodeproj**
4. At the top, pick **Clips** and your iPhone (or iPhone Simulator)
5. Click the Play button
6. The first time, sign in with your **Apple ID** in Xcode (Xcode → Settings → Accounts) so the app can run on your phone

You do not need to run git commands.

## App Store later

You need:

- Apple Developer Program (paid, on Apple’s site)
- A unique bundle id — this project uses `us.calabi.clips` (change it in Xcode if Apple says it is taken)
- Archive in Xcode → Upload to App Store Connect

## Site URL

Edit `Clips/Site.swift` if the site address ever changes.
