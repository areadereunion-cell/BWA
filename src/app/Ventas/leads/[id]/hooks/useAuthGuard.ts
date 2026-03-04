"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuthGuard() {
  const router = useRouter();
  const [validando, setValidando] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/verify", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) return router.push("/login");
        if (!data.user?.rol || data.user.rol.trim() === "") return router.push("/login");
        setUsuario(data.user);
        setValidando(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  return { validando, usuario };
}