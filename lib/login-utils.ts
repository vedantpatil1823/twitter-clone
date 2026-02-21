/**
 * Login security utilities — User-Agent parsing & time-window checks
 */

interface DeviceInfo {
    browser: string;
    os: string;
    deviceType: "desktop" | "mobile" | "tablet";
}

export function parseUserAgent(ua: string): DeviceInfo {
    // ── Browser detection ────────────────────────────────
    let browser = "Unknown";
    if (/Edg\//i.test(ua)) browser = "Edge";
    else if (/OPR|Opera/i.test(ua)) browser = "Opera";
    else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
    else if (/Firefox/i.test(ua)) browser = "Firefox";
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
    else if (/MSIE|Trident/i.test(ua)) browser = "Internet Explorer";

    // ── OS detection ─────────────────────────────────────
    let os = "Unknown";
    if (/Windows/i.test(ua)) os = "Windows";
    else if (/Macintosh|Mac OS/i.test(ua)) os = "macOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
    else if (/Linux/i.test(ua)) os = "Linux";
    else if (/CrOS/i.test(ua)) os = "ChromeOS";

    // ── Device type detection ────────────────────────────
    let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
    if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) {
        deviceType = "mobile";
    } else if (/Tablet|iPad|Android(?!.*Mobile)/i.test(ua)) {
        deviceType = "tablet";
    }

    return { browser, os, deviceType };
}

/** Returns true for Chrome on desktop (not Edge/Opera) */
export function isChromeDesktop(ua: string): boolean {
    const info = parseUserAgent(ua);
    return info.browser === "Chrome" && info.deviceType === "desktop";
}

/** Returns true for Microsoft browsers (Edge, IE) */
export function isMicrosoftBrowser(ua: string): boolean {
    const info = parseUserAgent(ua);
    return info.browser === "Edge" || info.browser === "Internet Explorer";
}

/** Returns true if the device is mobile */
export function isMobileDevice(ua: string): boolean {
    const info = parseUserAgent(ua);
    return info.deviceType === "mobile";
}

/** Check if current IST time is within 10:00 AM – 1:00 PM */
export function isWithinMobileLoginWindow(): boolean {
    const now = new Date();
    // Convert to IST (UTC+5:30)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const istDate = new Date(utcMs + istOffsetMs);
    const hours = istDate.getHours();
    // 10:00 AM (10) to 1:00 PM (13) — hours 10, 11, 12
    return hours >= 10 && hours < 13;
}
