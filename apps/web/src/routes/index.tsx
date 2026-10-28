import { createFileRoute } from "@tanstack/react-router";

import { LibraryApp } from "#src/components/library-app.tsx";
export const Route = createFileRoute("/")({ component: LibraryApp });
