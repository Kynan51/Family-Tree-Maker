"use client";

import { useEffect, useState } from "react";
import { LoadingLink } from "@/components/ui/loading-link";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 text-center">
        <div className="max-w-3xl space-y-6">
          <Users className="h-16 w-16 mx-auto text-green-700 dark:text-green-500" />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Create Your Family Tree</h1>
          <p className="text-xl text-muted-foreground">
            Visualize your family history, preserve memories, and share your heritage with future generations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              asChild
              size="lg"
              className="bg-green-700 hover:bg-green-800 dark:bg-green-800 dark:hover:bg-green-700"
            >
              <LoadingLink href="/auth/signin">Get Started</LoadingLink>
            </Button>
            <Button asChild size="lg" variant="outline">
              <LoadingLink href="/tree/demo">View Demo</LoadingLink>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
