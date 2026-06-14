import { getCurrentUser } from "@/lib/auth";
import PokerTable from "./PokerTable";

export default async function TrenerPage() {
  const user = await getCurrentUser();
  return <PokerTable isLoggedIn={!!user} username={user?.username ?? null} />;
}
