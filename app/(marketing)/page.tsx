import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Pricing } from "@/components/landing/pricing";
import { Footer } from "@/components/landing/footer";

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
