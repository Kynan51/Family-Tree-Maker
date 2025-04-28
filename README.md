# Family Tree Maker

A comprehensive application for creating and managing family trees.

## Features

- Create and visualize family trees
- Timeline view of family members
- User management with different permission levels
- Privacy controls for family trees
- Export family data to Excel
- User profiles
- Super admin capabilities

## Environment Variables Setup

This application requires several environment variables to function properly. You can set them up in one of the following ways:

### Option 1: Using the Setup Script

Run the following command to set up your environment variables interactively:

\`\`\`bash
npm run setup
\`\`\`

### Option 2: Downloading from Vercel

If your project is deployed on Vercel, you can download the environment variables:

\`\`\`bash
npm run download-env
\`\`\`

### Option 3: Manual Setup

Create a `.env` file in the root directory with the following variables:

\`\`\`
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
\`\`\`

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see above)
4. Run the development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Setup

The application uses Supabase as its database. Make sure to run the SQL scripts in the `database-updates.sql` and `database-updates-v2.sql` files to set up the required tables and initial data.

## Error Handling

If you encounter any issues:

1. Check that all environment variables are correctly set
2. Ensure your Supabase instance is running and accessible
3. Check the console for specific error messages
4. If the application shows an error page, follow the instructions provided

## License

[MIT](LICENSE)
