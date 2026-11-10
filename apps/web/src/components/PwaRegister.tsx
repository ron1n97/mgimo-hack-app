"use client";

import { useEffect } from "react";
import { ensureServiceWorker } from "@/lib/push";

export function PwaRegister() {
  useEffect(() => {
    void ensureServiceWorker();
  }, []);

  return null;
}
