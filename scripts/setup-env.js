// This script helps users set up their environment variables
// Usage: node scripts/setup-env.js

const fs = require("fs")
const path = require("path")
const readline = require("readline")
const crypto = require("crypto")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

console.log("🌿 Family Tree Maker Environment Setup 🌿")
console.log("This script will help you set up the required environment variables.")

// Check if .env file already exists
if (fs.existsSync(".env")) {
  rl.question("An .env file already exists. Do you want to overwrite it? (y/n): ", (answer) => {
    if (answer.toLowerCase() !== "y") {
      console.log("Setup cancelled. Your .env file was not modified.")
      rl.close()
      return
    }
    setupEnv()
  })
} else {
  setupEnv()
}

function setupEnv() {
  console.log("\nPlease provide the following information:")

  rl.question("Supabase URL: ", (supabaseUrl) => {
    rl.question("Supabase Anon Key: ", (supabaseAnonKey) => {
      rl.question("Supabase Service Role Key: ", (supabaseServiceKey) => {
        // Generate a random NEXTAUTH_SECRET if not provided
        const nextAuthSecret = crypto.randomBytes(32).toString("hex")

        rl.question(`NextAuth URL (default: http://localhost:3000): `, (nextAuthUrl) => {
          const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}

# NextAuth Configuration
NEXTAUTH_SECRET=${nextAuthSecret}
NEXTAUTH_URL=${nextAuthUrl || "http://localhost:3000"}
`

          fs.writeFileSync(".env", envContent)
          console.log("\n✅ Environment variables have been set up successfully!")
          console.log("You can now start your application.")
          rl.close()
        })
      })
    })
  })
}
