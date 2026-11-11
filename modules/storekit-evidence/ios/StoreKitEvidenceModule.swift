import ExpoModulesCore
import StoreKit

public final class StoreKitEvidenceModule: Module {
  private var updates: Task<Void, Never>?

  public func definition() -> ModuleDefinition {
    Name("StoreKitEvidence")

    Events("onTransactionsChanged")

    AsyncFunction("entitlements") { () async -> [[String: Any]] in
      var records: [[String: Any]] = []
      for await result in StoreKit.Transaction.currentEntitlements {
        records.append(Self.record(result))
      }
      return records
    }

    AsyncFunction("latest") { (productId: String) async -> [String: Any]? in
      guard let result = await StoreKit.Transaction.latest(for: productId) else {
        return nil
      }
      return Self.record(result)
    }

    AsyncFunction("sync") { () async throws in
      try await AppStore.sync()
    }

    OnStartObserving { [weak self] in
      self?.updates?.cancel()
      self?.updates = Task { [weak self] in
        for await _ in StoreKit.Transaction.updates {
          self?.sendEvent("onTransactionsChanged", [:])
        }
      }
    }

    OnStopObserving { [weak self] in
      self?.updates?.cancel()
      self?.updates = nil
    }
  }

  private static func record(_ result: VerificationResult<StoreKit.Transaction>) -> [String: Any] {
    switch result {
    case .verified(let transaction):
      return fields(transaction, verified: true)
    case .unverified(let transaction, _):
      return fields(transaction, verified: false)
    }
  }

  private static func fields(_ transaction: StoreKit.Transaction, verified: Bool) -> [String: Any] {
    var fields: [String: Any] = [
      "originalId": String(transaction.originalID),
      "productId": transaction.productID,
      "productType": transaction.productType == .nonConsumable ? "nonConsumable" : "other",
      "appBundleId": transaction.appBundleID,
      "environment": environment(transaction.environment),
      "ownershipType": transaction.ownershipType == .purchased ? "purchased" : "other",
      "signedDateMs": milliseconds(transaction.signedDate),
      "verified": verified,
    ]
    if let revocationDate = transaction.revocationDate {
      fields["revocationDateMs"] = milliseconds(revocationDate)
    }
    return fields
  }

  private static func environment(_ environment: AppStore.Environment) -> String {
    switch environment {
    case .sandbox:
      return "sandbox"
    case .production:
      return "production"
    default:
      return "other"
    }
  }

  private static func milliseconds(_ date: Date) -> Double {
    (date.timeIntervalSince1970 * 1000).rounded()
  }
}
