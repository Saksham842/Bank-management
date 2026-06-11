/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: "class",
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			fontFamily: {
				sans: ["Inter", "system-ui", "sans-serif"],
				heading: ['"Space Grotesk"', "system-ui", "sans-serif"],
			},
			spacing: {
				// fractional spacing used across components
				1.5: "0.375rem",
				2.5: "0.625rem",
				3.5: "0.875rem",
				4.5: "1.125rem",
				4.75: "1.1875rem",
				5.5: "1.375rem",
				6.5: "1.625rem",
				8.5: "2.125rem",
			},
			colors: {
				spaceBlack: "#060912",
				primaryViolet: "#7c3aed",
				primaryIndigo: "#4f46e5",
				primaryCyan: "#06b6d4",
				primary: {
					DEFAULT: "#7c3aed",
					50: "#f5f3ff",
					400: "#a78bfa",
					500: "#8b5cf6",
					600: "#7c3aed",
					700: "#6d28d9",
				},
			},
			backgroundImage: {
				"gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
			},
			animation: {
				float: "float 6s ease-in-out infinite",
				"pulse-soft": "pulse-soft 3s ease-in-out infinite",
			},
		},
	},
	plugins: [],
};
