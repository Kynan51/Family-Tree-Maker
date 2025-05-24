// This script downloads environment variables from Vercel
// Usage: node scripts/download-env.js

const fs = require("fs")
const path = require("path")
const https = require("https")
const readline = require("readline")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

rl.question("Enter your Vercel project ID (or press Enter to skip): ", (projectId) => {
  if (!projectId) {
    createEnvFromTemplate()
    return
  }

  rl.question("Enter your Vercel access token: ", (token) => {
    if (!token) {
      createEnvFromTemplate()
      return
    }

    const options = {
      hostname: "api.vercel.com",
      path: `/v9/projects/${projectId}/env`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }

    const req = https.request(options, (res) => {
      let data = ""

      res.on("data", (chunk) => {
        data += chunk
      })

      res.on("end", () => {
        if (res.statusCode !== 200) {
          console.error(`Error: ${res.statusCode}`)
          console.error(data)
          createEnvFromTemplate()
          return
        }

        try {
          const envVars = JSON.parse(data)

          if (!envVars.envs || envVars.envs.length === 0) {
            createEnvFromTemplate()
            return
          }

          let envContent = "# Environment variables downloaded from Vercel\n"
          envVars.envs.forEach((env) => {
            if (env.type === "encrypted") {
              envContent += `${env.key}=${env.value}\n`
            }
          })

          fs.writeFileSync(".env", envContent)
          rl.close()
        } catch (error) {
          console.error("Error parsing response:", error)
          createEnvFromTemplate()
        }
      })
    })

    req.on("error", (error) => {
      console.error("Error downloading environment variables:", error)
      createEnvFromTemplate()
    })

    req.end()
  })
})

function createEnvFromTemplate() {
  try {
    if (fs.existsSync(".env.example")) {
      fs.copyFileSync(".env.example", ".env")
    } else {
      const template = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
`
      fs.writeFileSync(".env", template)
    }
  } catch (error) {
    console.error("Error creating .env file:", error)
  } finally {
    rl.close()
  }
}
