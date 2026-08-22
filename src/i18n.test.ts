import { describe, expect, it } from "vitest";

import { resolveLanguage } from "./i18n";

describe("resolveLanguage", () => {
    it("detects Japanese", () => {
        expect(resolveLanguage(["ja-JP"])).toBe("ja");
    });

    it("detects Simplified Chinese", () => {
        expect(resolveLanguage(["zh-CN"])).toBe("zh-CN");
    });

    it("uses the first supported language in the preference list", () => {
        expect(resolveLanguage(["fr-FR", "zh-Hans", "en-US"])).toBe("zh-CN");
    });

    it("falls back to English", () => {
        expect(resolveLanguage(["fr-FR"])).toBe("en");
    });
});
