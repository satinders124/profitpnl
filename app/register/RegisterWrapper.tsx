"use client";

import dynamic from "next/dynamic";

const RegisterClient = dynamic(() => import("./RegisterClient"), {
  ssr: false,
});

export default function RegisterWrapper() {
  return <RegisterClient />;
}
