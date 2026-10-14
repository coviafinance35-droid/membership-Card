import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
  orm: {
    adapter: { provider: "prisma-postgres" },
    family: { provider: "postgresql" },
    target: { provider: "local" },
  },
  skills: { agents: [] },
});
