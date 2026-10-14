import { definePrismaConfig } from "prisma/config";
import { defineConfig as orm } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  orm: orm({ contract: "./prisma/schema.prisma" }),
  skills: { agents: [] },
});
