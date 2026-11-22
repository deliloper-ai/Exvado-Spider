"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { tokenManager } from "@/lib/auth"

export function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    if (!tokenManager.hasToken()) {
      router.replace("/login")
      return
    }
    setAuthChecked(true)
  }, [router])

  if (!authChecked) return null

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  )
}
