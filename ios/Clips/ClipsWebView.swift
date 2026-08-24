import SwiftUI
import WebKit

struct ClipsWebView: UIViewRepresentable {
  @ObservedObject var session: WebSession

  func makeCoordinator() -> Coordinator {
    Coordinator(session: session)
  }

  func makeUIView(context: Context) -> WKWebView {
    let config = WKWebViewConfiguration()
    config.applicationNameForUserAgent = "ClipsiOS/1.0"
    config.allowsInlineMediaPlayback = true
    config.mediaTypesRequiringUserActionForPlayback = []
    config.websiteDataStore = .default()
    config.defaultWebpagePreferences.allowsContentJavaScript = true
    if #available(iOS 15.4, *) {
      config.preferences.isElementFullscreenEnabled = true
    }

    let web = WKWebView(frame: .zero, configuration: config)
    web.navigationDelegate = context.coordinator
    web.uiDelegate = context.coordinator
    web.scrollView.contentInsetAdjustmentBehavior = .never
    web.backgroundColor = UIColor(red: 9 / 255, green: 9 / 255, blue: 12 / 255, alpha: 1)
    web.isOpaque = false
    if #available(iOS 16.4, *) {
      web.isInspectable = true
    }

    session.reloadHandler = { [weak web] in
      web?.load(URLRequest(url: Site.url))
    }
    web.load(URLRequest(url: Site.url))
    return web
  }

  func updateUIView(_ uiView: WKWebView, context: Context) {}

  final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
    let session: WebSession
    init(session: WebSession) { self.session = session }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
      let ns = error as NSError
      if ns.domain == NSURLErrorDomain && ns.code == NSURLErrorCancelled { return }
      session.failed = true
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
      let ns = error as NSError
      if ns.domain == NSURLErrorDomain && ns.code == NSURLErrorCancelled { return }
      session.failed = true
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
      session.failed = false
    }

    func webView(
      _ webView: WKWebView,
      decidePolicyFor navigationAction: WKNavigationAction,
      decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
      guard let url = navigationAction.request.url else {
        decisionHandler(.allow)
        return
      }
      if url.scheme == "about" || url.scheme == "blob" || url.scheme == "data" {
        decisionHandler(.allow)
        return
      }
      if Site.allows(url) {
        decisionHandler(.allow)
        return
      }
      if ["http", "https"].contains(url.scheme ?? "") {
        UIApplication.shared.open(url)
        decisionHandler(.cancel)
        return
      }
      decisionHandler(.cancel)
    }

    func webView(
      _ webView: WKWebView,
      createWebViewWith configuration: WKWebViewConfiguration,
      for navigationAction: WKNavigationAction,
      windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
      if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
        if Site.allows(url) {
          webView.load(navigationAction.request)
        } else if ["http", "https"].contains(url.scheme ?? "") {
          UIApplication.shared.open(url)
        }
      }
      return nil
    }

    func webView(
      _ webView: WKWebView,
      requestMediaCapturePermissionFor origin: WKSecurityOrigin,
      initiatedByFrame frame: WKFrameInfo,
      type: WKMediaCaptureType,
      decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
      let host = origin.host.lowercased()
      if host == Site.host || host.hasSuffix(".\(Site.host)") {
        decisionHandler(.grant)
      } else {
        decisionHandler(.deny)
      }
    }
  }
}
