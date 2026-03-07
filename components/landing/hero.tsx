import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700" />

      {/* Subtle dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Know When Your Site Goes Down.
            <span className="block mt-2 text-brand-100">
              Fix It Before Your Users Notice.
            </span>
          </h1>

          <p className="mt-6 text-lg leading-8 text-brand-100/90 sm:text-xl">
            Simple, reliable uptime monitoring starting at{" "}
            <span className="font-semibold text-white">$5/mo</span> &mdash;
            while others charge{" "}
            <span className="font-semibold text-white line-through decoration-white/60">
              $34/mo
            </span>{" "}
            for less. Built for indie developers who need peace of mind, not
            bloated dashboards.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Button
              size="lg"
              nativeButton={false}
              className="h-12 px-8 text-base font-semibold bg-white text-brand-700 hover:bg-brand-50 shadow-lg shadow-brand-900/20 border-0"
              render={<Link href="/signup" />}
            >
              Start Free Trial
            </Button>
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              className="h-12 px-8 text-base font-semibold text-white border-white/30 bg-white/10 hover:bg-white/20 hover:text-white"
              render={<Link href="#pricing" />}
            >
              View Pricing
            </Button>
          </div>

          <p className="mt-6 text-sm text-brand-200">
            14-day free trial. No credit card required.
          </p>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
