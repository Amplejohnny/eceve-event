import SignupForm from "@/components/auth/SignupForm";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({
  title: "Sign Up - Comforeve",
  description: "Create your account to start using Comforeve.",
  keywords: [
    "signup",
    "register",
    "create account",
    "user registration",
    "Comforeve",
  ],
  url: "https://www.comforeve.com/auth/register",
});

export default function SignupPage() {
  return <SignupForm />;
}
