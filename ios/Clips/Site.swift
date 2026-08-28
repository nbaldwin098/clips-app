import Foundation

enum Site {
  static let name = "calabi"
  static let host = "calabi.us"
  static let url = URL(string: "https://calabi.us")!

  static let allowedHosts: Set<String> = [
    "calabi.us",
    "www.calabi.us",
    "buy.stripe.com",
    "checkout.stripe.com",
    "js.stripe.com",
    "m.stripe.com",
    "appleid.apple.com",
    "login.microsoftonline.com",
    "login.live.com",
    "login.microsoft.com",
    "twitter.com",
    "api.twitter.com",
    "x.com",
    "mobile.twitter.com",
  ]

  static func allows(_ url: URL) -> Bool {
    guard let host = url.host?.lowercased() else { return false }
    if allowedHosts.contains(host) { return true }
    if host.hasSuffix(".supabase.co") { return true }
    if host.hasSuffix(".stripe.com") { return true }
    if host.hasSuffix(".calabi.us") { return true }
    return false
  }
}
