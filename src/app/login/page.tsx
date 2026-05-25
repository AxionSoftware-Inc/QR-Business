import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleLoginClient } from "./google-login-client";

export const metadata: Metadata = {
  title: "Google login | BM QR",
};

export default function LoginPage() {
  return (
    <Suspense>
      <GoogleLoginClient />
    </Suspense>
  );
}
