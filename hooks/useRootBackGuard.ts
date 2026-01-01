import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

export function useRootBackGuard(enabled = true) {
  const blocker = useBlocker(({ historyAction }) => {
    return enabled && historyAction === "POP";
  });

  useEffect(() => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }, [blocker]);
}
