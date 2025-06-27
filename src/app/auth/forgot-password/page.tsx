import ForgotPasswordForm from "@/components/auth/ForgetPasswordForm";

export const metadata = {
  title: "Reset Password - Comforeve",
  description: "Reset your Comforeve password",
  keywords: [
    "reset password",
    "forgot password",
    "password recovery",
    "Comforeve",
  ],
  openGraph: {
    title: "Reset Password - Comforeve",
    description: "Reset your Comforeve password",
    url: "https://www.comforeve.com/auth/forgot-password",
    siteName: "Comforeve",
  },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
