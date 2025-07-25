import { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
