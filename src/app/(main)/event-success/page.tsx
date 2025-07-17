import { Suspense } from "react";
import EventSuccessPageClient from "./EventSuccessPageClient";

export default function EventSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EventSuccessPageClient />
    </Suspense>
  );
}
