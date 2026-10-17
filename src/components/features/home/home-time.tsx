import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Team } from "@/contracts";
import { formatTeamStart } from "@/lib/team-display";

const HomeTimeZone = createContext<string | undefined>("UTC");

/** Keep the server time zone through hydration, then display the visitor's local time. */
export function HomeTimeProvider({ initialTimeZone, children }: {
  initialTimeZone: string;
  children: ReactNode;
}) {
  const [timeZone, setTimeZone] = useState<string | undefined>(initialTimeZone);
  useEffect(() => setTimeZone(undefined), []);
  return <HomeTimeZone.Provider value={timeZone}>{children}</HomeTimeZone.Provider>;
}

export function useHomeTeamTime() {
  const timeZone = useContext(HomeTimeZone);
  // Numeric dates use a fixed calendar/numbering system on both sides of hydration.
  return (team: Pick<Team, "startAt">) => formatTeamStart(team, "en-US", timeZone);
}
