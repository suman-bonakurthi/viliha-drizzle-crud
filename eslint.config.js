const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

// Flat config (ESLint 9+/10). Extends typescript-eslint's recommended rules but
// relaxes the ones that clash with this package's intentional style: Drizzle's
// dynamic query builders are typed as `any`, and the CRUD lifecycle hooks are
// deliberately empty no-ops meant for subclasses to override.
module.exports = [
	{
		ignores: ["dist/**", "node_modules/**", "coverage/**"],
	},
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 2022,
			sourceType: "module",
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
		},
	},
];
