"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

const LoginClient = dynamic(() => import("./LoginClient"), {
  ssr: false,
});

export default function LoginWrapper() {
  useEffect(() => {
    document.getElementById("login-server-fallback")?.remove();
  }, []);

  return <LoginClient />;
}
