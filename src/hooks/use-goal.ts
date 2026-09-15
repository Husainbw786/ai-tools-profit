import { useEffect, useState } from "react";

const KEY = "profitai.monthlyGoal";

export function useMonthlyGoal() {
  const [goal, setGoalState] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem(KEY);
    setGoalState(v ? Number(v) || 0 : 0);
  }, []);

  const setGoal = (n: number) => {
    setGoalState(n);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY, String(n));
    }
  };

  return { goal, setGoal };
}
