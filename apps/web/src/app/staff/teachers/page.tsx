"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Преподавателей распределяет кафедра — раздел убран из кабинета деканата МЭО. */
export default function StaffTeachersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/staff");
  }, [router]);

  return null;
}
