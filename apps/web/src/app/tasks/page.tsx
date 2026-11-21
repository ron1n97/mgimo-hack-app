"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Задания убраны из студенческого кабинета (dogfood Макса). */
export default function TasksRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/grades");
  }, [router]);

  return null;
}
