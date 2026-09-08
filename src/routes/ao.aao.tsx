import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ao/aao")({
  beforeLoad: () => {
    throw redirect({ to: "/exam-dashboard" });
  },
});
