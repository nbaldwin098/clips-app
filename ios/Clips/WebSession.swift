import Foundation
import Combine

final class WebSession: ObservableObject {
  @Published var failed = false
  var reloadHandler: (() -> Void)?

  func reload() {
    failed = false
    reloadHandler?()
  }
}
