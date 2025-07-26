import LoginForm from "@/components/auth/LoginForm";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({
  title: "Login - Comforeve",
  description:
    "Log in to your Comforeve account to access your dashboard and manage your settings.",
  keywords: ["login", "sign in", "authentication", "user account", "Comforeve"],
  url: "https://www.comforeve.com/auth/login",
});

export default function LoginPage() {
  return <LoginForm />;
}
