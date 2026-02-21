import { redirect } from "next/navigation";

/* History is now merged into the home page. Redirect any direct links. */
export default function HistoryPage() {
  redirect("/app/co-reading");
}
