import { DriverFlow } from "@/components/driver/DriverFlow";
import { loadOffers, seedData } from "@/lib/data";

// Driver path (SPEC.md section 2). Offers are validated on the server; invalid ones never reach the page.
export default function Home() {
  const { offers, partners, assumptions } = loadOffers();
  return (
    <DriverFlow
      offers={offers}
      partners={partners}
      assumptions={assumptions}
      dataDate={seedData.meta.collectedAt}
    />
  );
}
