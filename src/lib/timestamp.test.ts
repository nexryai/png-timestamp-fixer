import { describe, expect, it } from "vitest";

import { extractTimestampFromFilename } from "./timestamp";

describe("extractTimestampFromFilename", () => {
    const unixTimestampFilename = "screenshot_1728111920.png";

    it("ignores the timezone setting when requested", () => {
        expect(extractTimestampFromFilename(unixTimestampFilename, 9, true)).toBe("2024:10:05 07:05:20");
    });

    it("applies the timezone setting when it is not ignored", () => {
        expect(extractTimestampFromFilename(unixTimestampFilename, 9, false)).toBe("2024:10:05 16:05:20");
    });

    it("keeps an explicit datetime in the filename unchanged", () => {
        expect(extractTimestampFromFilename("screenshot_2025-01-22_20:26:51.png", 9, true)).toBe("2025:01:22 20:26:51");
    });
});
