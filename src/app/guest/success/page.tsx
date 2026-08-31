import { redirect } from "next/navigation";

export default function GuestSuccessPage() {
  redirect("/guest/dashboard");
}
