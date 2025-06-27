import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Login - Comforeve",
  description:
    "Log in to your Comforeve account to access your dashboard and manage your settings.",
  keywords: ["login", "sign in", "authentication", "user account", "Comforeve"],
  openGraph: {
    title: "Login - Comforeve",
    description:
      "Log in to your Comforeve account to access your dashboard and manage your settings.",
    url: "https://www.comforeve.com/auth/login",
    siteName: "Comforeve",
  },
};

export default function LoginPage() {
  return <LoginForm />;
}
