import { Elysia } from "elysia";
import { db } from "./db";
import { users } from "./db/schema";

const app = new Elysia()
  .get("/", () => {
    return {
      status: "success",
      message: "Welcome to Elysia API with Bun, Drizzle, and MySQL!",
    };
  })
  .get("/users", async () => {
    try {
      const allUsers = await db.select().from(users);
      return {
        status: "success",
        data: allUsers,
      };
    } catch (error: any) {
      return {
        status: "error",
        message: error.message || "Failed to fetch users. Note: Database connection might need to be configured.",
      };
    }
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
