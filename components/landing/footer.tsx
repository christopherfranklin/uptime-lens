import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-muted/20">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500">
              <span className="text-xs font-bold text-white">UL</span>
            </div>
            <span className="text-sm font-medium">Uptime Lens</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              href="#"
              className="transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="transition-colors hover:text-foreground"
            >
              Terms
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Uptime Lens. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
