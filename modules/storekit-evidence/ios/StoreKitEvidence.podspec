Pod::Spec.new do |s|
  s.name           = 'StoreKitEvidence'
  s.version        = '1.0.0'
  s.summary        = 'Read-only StoreKit 2 ownership evidence for Pocket Fortune'
  s.description    = 'Reads verified StoreKit 2 transactions and syncs with the App Store. Never purchases or finishes transactions.'
  s.license        = 'UNLICENSED'
  s.author         = 'Pocket Fortune'
  s.homepage       = 'https://github.com/chrisgocode/pocket-mogul'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
