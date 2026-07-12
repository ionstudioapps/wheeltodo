"use client";

import { useApp } from "@/context/AppContext";

export function useSubscription() {
  const { isPremium, activatePremium, deactivatePremium, planBilling, setPlanBilling } = useApp();
  return {
    isPremium,
    loaded: true,
    activate: activatePremium,
    deactivate: deactivatePremium,
    planBilling,
    setPlanBilling,
  };
}
