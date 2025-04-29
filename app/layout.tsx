import { Inter } from "next/font/google"
import "./globals.css"
import { ClientLayout } from "@/components/client-layout"
import { ThemeScript } from "@/components/theme-script"

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
        <ThemeScript />
      </head>
      <body className={inter.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
