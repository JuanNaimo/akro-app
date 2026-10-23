import type { Metadata } from "next";
import { CheckEmail } from "./check-email";

export const metadata: Metadata = { title: "Revisá tu mail" };

export default function CheckEmailPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-strong">Revisá tu mail</h1>
      <CheckEmail />
    </>
  );
}
