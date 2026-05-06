import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/lib/**/*.{js,ts}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: "#6366F1",
                    dark: "#4F46E5",
                    light: "#818CF8",
                },
                accent: {
                    DEFAULT: "#8B5CF6",
                    dark: "#7C3AED",
                },
                surface: {
                    canvas: "#020617",
                    sidebar: "#0F172A",
                    card: "rgba(255,255,255,0.025)",
                    elevated: "rgba(255,255,255,0.05)",
                },
                status: {
                    paid: "#10B981",
                    pending: "#F59E0B",
                    overdue: "#EF4444",
                    draft: "#71717A",
                },
            },
            spacing: {
                "sidebar": "260px",
                "sidebar-sm": "64px",
                "topbar": "56px",
                "bottom-nav": "64px",
            },
            fontFamily: {
                sans: ["var(--font-inter)", "sans-serif"],
                mono: ["var(--font-mono)", "monospace"],
                heading: ["var(--font-heading)", "var(--font-inter)", "sans-serif"],
            },
            backgroundImage: {
                "brand-gradient": "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
            },
            boxShadow: {
                glow: "0 0 24px rgba(99,102,241,0.35)",
                "glow-sm": "0 0 12px rgba(99,102,241,0.25)",
                "glow-card": "0 4px 24px rgba(0,0,0,0.4)",
            },
            transitionProperty: {
                "sidebar": "width, margin-left",
            },
        },
    },
    plugins: [],
};
export default config;
