import ForgotPasswordForm from "@/components/auth/ForgetPasswordForm";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({
  title: "Reset Password - Comforeve",
  description: "Reset your Comforeve password",
  keywords: [
    "reset password",
    "forgot password",
    "password recovery",
    "Comforeve",
  ],
  url: "https://www.comforeve.com/auth/forgot-password",
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
