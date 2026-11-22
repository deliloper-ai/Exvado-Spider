import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Exvado Spider - Admin Panel",
  description: "Modern admin panel tasarımı",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={inter.className} suppressHydrationWarning>
        <div className="min-h-screen bg-background">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  )
}
