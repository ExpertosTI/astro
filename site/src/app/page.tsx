import AstroHero from "@/components/astro-hero";
import { NativeEntryRedirect } from "@/components/NativeEntryRedirect";

export default function Home() {
  return (
    <>
      <NativeEntryRedirect />
      <AstroHero />
    </>
  );
}
