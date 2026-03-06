import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

const features = [
  {
    icon: "🌐",
    title: "Multi-Protocol Monitoring",
    description:
      "Monitor HTTP endpoints, TCP ports, and SSL certificates. One tool for all your uptime needs.",
  },
  {
    icon: "⚡",
    title: "3-Minute Check Intervals",
    description:
      "Your monitors run every 3 minutes, so you know about downtime fast — not hours later.",
  },
  {
    icon: "📧",
    title: "Instant Email Alerts",
    description:
      "Get notified the moment something goes down. Clear, actionable alerts with no noise.",
  },
  {
    icon: "📊",
    title: "Response Time Charts",
    description:
      "Track performance trends with response time history and uptime percentage stats.",
  },
];

export function Features() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need.
            <span className="text-brand-500"> Nothing you don't.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No complex dashboards, no enterprise upsells. Just reliable
            monitoring that works.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-0 bg-muted/40 shadow-none transition-all hover:bg-muted/70 hover:shadow-sm"
            >
              <CardHeader>
                <div className="mb-1 text-2xl" aria-hidden="true">
                  {feature.icon}
                </div>
                <CardTitle className="text-base font-semibold">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
