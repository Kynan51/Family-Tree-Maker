import { Inter } from "next/font/google"
import "./globals.css"
import { ClientLayout } from "@/components/client-layout"
import { MaximizedContextProvider } from "@/components/maximized-context";
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Family Tree Maker",
  description: "Create and manage your family tree",
  generator: "v0.dev"
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <MaximizedContextProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </MaximizedContextProvider>
        <Analytics />
      </body>
    </html>
  )
}
