/// <reference types="vitest/config" />

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { execFileSync } from "node:child_process";

function getCommitHash(): string {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);

    try {
        return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], { encoding: "utf8" }).trim();
    } catch {
        return "unknown";
    }
}

// https://vite.dev/config/
export default defineConfig({
    define: {
        __COMMIT_HASH__: JSON.stringify(getCommitHash()),
    },
    plugins: [react(), tailwindcss()],
    test: {
        include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
        globals: true,
    },
});
