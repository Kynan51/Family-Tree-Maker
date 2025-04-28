import { LandingPage } from "@/components/landing-page"
import { Button } from "@/components/ui/button"
import { Link } from "next/navigation"

export default function Home() {
  // We'll handle authentication client-side to avoid server-side errors
  return <LandingPage />
}
