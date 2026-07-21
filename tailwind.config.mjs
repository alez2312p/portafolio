/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	darkMode: "class",
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
				mono: ['JetBrains Mono Variable', 'JetBrains Mono', 'monospace'],
				display: ['Outfit Variable', 'Outfit', 'sans-serif'],
			},
		},
	},
	plugins: [],
}
