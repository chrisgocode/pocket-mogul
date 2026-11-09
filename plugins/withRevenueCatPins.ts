import { withProjectBuildGradle, type ConfigPlugin } from 'expo/config-plugins';

const pins = `
allprojects {
  configurations.configureEach {
    resolutionStrategy.force 'com.revenuecat.purchases:purchases-hybrid-common:19.17.0'
    resolutionStrategy.force 'com.revenuecat.purchases:purchases:10.30.0'
    resolutionStrategy.force 'com.android.billingclient:billing:8.3.0'
  }
}
`;

const withRevenueCatPins: ConfigPlugin = (config) =>
  withProjectBuildGradle(config, (native) => {
    if (!native.modResults.contents.includes(pins.trim())) native.modResults.contents += pins;
    return native;
  });

export default withRevenueCatPins;
