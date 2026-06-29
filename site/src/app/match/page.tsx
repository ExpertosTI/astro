"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMatch } from "@/components/match/MatchProvider";

export default function MatchIndexPage() {
  const router = useRouter();
  const { state, ready } = useMatch();

  useEffect(() => {
    if (!ready) return;
    if (!state.session) {
      router.replace("/match/onboarding/");
      return;
    }
    const profile = state.session.profile;
    const incomplete =
      !profile.displayName || (profile.role === "lienzo" && profile.bodyParts.length === 0);
    if (incomplete) {
      router.replace("/match/onboarding/");
    } else {
      router.replace("/match/discover/");
    }
  }, [ready, state.session, router]);

  return null;
}
