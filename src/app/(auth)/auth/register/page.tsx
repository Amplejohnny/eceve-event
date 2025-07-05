import SignupForm from "@/components/auth/SignupForm";

export const metadata = {
  title: "Sign Up - Comforeve",
  description: "Create your account to start using Conforeve.",
  keywords: [
    "signup",
    "register",
    "create account",
    "user registration",
    "Comforeve",
  ],
  openGraph: {
    title: "Sign Up - Comforeve",
    description: "Create your account to start using Comforeve.",
    url: "https://www.comforeve.com/auth/register",
    siteName: "Comforeve",
  },
};

export default function SignupPage() {
  return <SignupForm />;
}
