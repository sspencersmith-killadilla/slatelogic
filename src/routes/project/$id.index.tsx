import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/project/$id/")({
  beforeLoad: ({ params }) => { throw redirect({ to: "/project/$id/schedule", params }); },
});
