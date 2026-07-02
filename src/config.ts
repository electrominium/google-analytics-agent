import "dotenv/config";
import type { AppConfig } from "./types.js";

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const APPS: AppConfig[] = [
  {
    name: "hitcalc",
    displayName: "HitCalc",
    gscSiteUrl: required("HITCALC_GSC_SITE_URL"),
    ga4PropertyId: required("HITCALC_GA4_PROPERTY_ID"),
    repoPath: "/Users/asif/Documents/Business/hitcalc/hitcalc_code",
  },
  {
    name: "sacredcal",
    displayName: "SacredCal",
    gscSiteUrl: required("SACREDCAL_GSC_SITE_URL"),
    ga4PropertyId: required("SACREDCAL_GA4_PROPERTY_ID"),
    repoPath: "/Users/asif/Documents/Business/sacredcal/sacredcal-code",
  },
];

export const RESEND_API_KEY = required("RESEND_API_KEY");
export const REPORT_TO_EMAIL = process.env.REPORT_TO_EMAIL ?? "electromlabs@gmail.com";
