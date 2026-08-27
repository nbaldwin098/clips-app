/**
 * Product feature flags. Keep defaults honest for what ships today.
 */

/** Site ads / advertiser portal are not offered. Monetization = tips, premium, Coins. */
export const FEATURE_ADS = false

/** Runtime helper — prefer FEATURE_ADS constant for static gates. */
export function adsEnabled() {
  return FEATURE_ADS === true
}
