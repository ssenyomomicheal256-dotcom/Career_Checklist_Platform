// Reads Replit Secrets (process.env) and writes a .env file
// that Vite can load. Runs before `vite dev` and `vite build`.
import { writeFileSync } from "node:fs";

const keys = [
	"VITE_FIREBASE_API_KEY",
	"VITE_FIREBASE_AUTH_DOMAIN",
	"VITE_FIREBASE_PROJECT_ID",
	"VITE_FIREBASE_STORAGE_BUCKET",
	"VITE_FIREBASE_MESSAGING_SENDER_ID",
	"VITE_FIREBASE_APP_ID",
];

const missing = keys.filter((k) => !process.env[k]);
if (missing.length) {
	console.warn(`⚠ Missing secrets: ${missing.join(", ")}`);
}

const contents = keys.map((k) => `${k}=${process.env[k] ?? ""}`).join("\n");

writeFileSync(".env", contents + "\n");
console.log("✓ .env written from Replit Secrets");
