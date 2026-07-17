import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65">
        <nav className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 md:px-8">
          <Wordmark href="/" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Home</Link>
            </Button>
            <ThemeToggle />
            <Button size="sm" asChild>
              <Link href="/dashboard">
                Dashboard
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Store management
          </p>
          <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight md:text-5xl">
            Hello, this is <span className="text-primary">SuedeBucks</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-highlight">Peirama</span>.
          </h1>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild>
              <Link href="/dashboard">
                Enter the dashboard
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 text-xs text-muted-foreground md:px-8">
          <span>SuedeBucks/Peirama</span>
          <span className="tabular-nums">© 2026</span>
        </div>
      </footer>
    </div>
  );
}
