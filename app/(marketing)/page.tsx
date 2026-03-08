import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Pricing } from "@/components/landing/pricing";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </>
  );
}
