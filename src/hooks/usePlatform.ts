import { useMemo } from "react";

export type PlatformOs = "android" | "ios" | "windows" | "desktop" | "other";

export interface PlatformInfo {
  os: PlatformOs;
  isMobile: boolean;
  isIpadOS: boolean;
  label: string;
}

const detect = (): PlatformInfo => {
  if (typeof navigator === "undefined") {
    return { os: "other", isMobile: false, isIpadOS: false, label: "your device" };
  }

  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string; mobile?: boolean };
    maxTouchPoints?: number;
  };

  const ua = (nav.userAgent || "").toLowerCase();
  const uaPlatform = (nav.userAgentData?.platform || "").toLowerCase();

  const isIpadOS =
    nav.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1;

  if (uaPlatform.includes("android") || /android/.test(ua)) {
    return { os: "android", isMobile: true, isIpadOS: false, label: "Android" };
  }

  if (isIpadOS || /iphone|ipad|ipod/.test(ua)) {
    return { os: "ios", isMobile: true, isIpadOS, label: isIpadOS ? "iPad" : "iPhone / iPad" };
  }

  if (uaPlatform.includes("windows") || /windows nt|win64|win32/.test(ua)) {
    return { os: "windows", isMobile: false, isIpadOS: false, label: "Windows" };
  }

  const mobileHint = nav.userAgentData?.mobile ?? /mobi/.test(ua);
  if (mobileHint) {
    return { os: "other", isMobile: true, isIpadOS: false, label: "your phone" };
  }

  return { os: "desktop", isMobile: false, isIpadOS: false, label: "desktop" };
};

/** Client-side OS detection used to tailor app download buttons and install steps. */
export const usePlatform = (): PlatformInfo => useMemo(detect, []);

export default usePlatform;
