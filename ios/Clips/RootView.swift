import SwiftUI

struct RootView: View {
  @StateObject private var session = WebSession()

  var body: some View {
    ZStack {
      Color(red: 9 / 255, green: 9 / 255, blue: 12 / 255).ignoresSafeArea()
      ClipsWebView(session: session)
        .ignoresSafeArea()

      if session.failed {
        VStack(spacing: 12) {
          Text("Clips could not load")
            .font(.headline)
            .foregroundStyle(.white)
          Text("Check the network, then try again.")
            .font(.subheadline)
            .foregroundStyle(.gray)
          Button("Retry") { session.reload() }
            .buttonStyle(.borderedProminent)
            .tint(.white)
            .foregroundStyle(.black)
        }
        .padding()
      }
    }
    .statusBarHidden(false)
  }
}
