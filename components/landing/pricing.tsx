import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const tiers = [
  {
    name: "Starter",
    price: "$5",
    period: "/mo",
    description: "Perfect for side projects and personal sites.",
    features: [
      "10 monitors",
      "3-minute check intervals",
      "Email alerts on downtime",
      "Response time charts",
      "Uptime statistics",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/mo",
    description: "For developers managing multiple projects.",
    features: [
      "30 monitors",
      "3-minute check intervals",
      "Email alerts on downtime",
      "Response time charts",
      "Uptime statistics",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
];

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-brand-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, honest pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No surprises. No hidden fees. UptimeRobot charges{" "}
            <span className="font-semibold text-foreground">$34/mo</span> for 20
            monitors &mdash; we start at{" "}
            <span className="font-semibold text-brand-600">$5/mo</span> for 10.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-2">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex flex-col ${
                tier.popular
                  ? "border-brand-500 ring-2 ring-brand-500/20 shadow-lg shadow-brand-500/10"
                  : "border-border"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-brand-500 text-white hover:bg-brand-500 px-3 py-0.5 text-xs font-semibold">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pt-6">
                <CardTitle className="text-xl font-semibold">
                  {tier.name}
                </CardTitle>
                <CardDescription>{tier.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">
                    {tier.price}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {tier.period}
                  </span>
                </div>

                <ul className="mt-6 space-y-3" role="list">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <CheckIcon />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="border-t-0 bg-transparent px-4 pb-6">
                <Button
                  size="lg"
                  nativeButton={false}
                  className={`w-full h-11 text-sm font-semibold ${
                    tier.popular
                      ? "bg-brand-500 text-white hover:bg-brand-600 border-0"
                      : "bg-foreground text-background hover:bg-foreground/90 border-0"
                  }`}
                  render={<Link href="/signup" />}
                >
                  {tier.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}
