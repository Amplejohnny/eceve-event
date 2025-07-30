import EmailVerified from "@/components/auth/EmailVerifiedCallback";
import { Suspense } from "react";

export default function EmailVerifyPage() {
  <Suspense fallback={<div>Loading...</div>}>
    return <EmailVerified />;
  </Suspense>;
}
