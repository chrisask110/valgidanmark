import type { Metadata } from "next";
import { InstitutterClient } from "@/app/components/InstitutterClient";

export const metadata: Metadata = {
  title: "Institutter",
  description: "Bedømmelse af danske meningsmålingsinstitutter — nøjagtighed, metode og vægtning i ValgiDanmarks model.",
};

export default function InstitutterPage() {
  return <InstitutterClient />;
}
