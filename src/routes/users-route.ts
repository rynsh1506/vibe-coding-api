import { Elysia, t } from "elysia";
import { usersService } from "../services/users-service";

export const usersRoute = new Elysia({ prefix: "/api" })
  .post("/users", async ({ body, set }) => {
    try {
      const { name, email, password } = body;
      
      const user = await usersService.register({ name, email, password });
      
      if (!user) {
        set.status = 400; // Bad Request / Conflict
        return {
          status: "error",
          message: "User already exists",
          data: null,
        };
      }

      set.status = 201; // Created
      return {
        status: "success",
        message: "User created successfully",
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
        },
      };
    } catch (error: any) {
      set.status = 500;
      return {
        status: "error",
        message: error.message || "Internal server error",
        data: null,
      };
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      email: t.String({ format: "email" }),
      password: t.String({ minLength: 6 }),
    }),
    detail: {
      summary: "Register a new user",
      tags: ["Users"],
    }
  })
  .post("/users/login", async ({ body, set }) => {
    try {
      const { email, password } = body;
      
      const token = await usersService.login({ email, password });
      
      if (!token) {
        set.status = 400; // Bad Request
        return {
          status: "error",
          message: "Password or Email is incorrect",
          data: null,
        };
      }

      return {
        status: "success",
        message: "User logged in successfully",
        data: token,
      };
    } catch (error: any) {
      set.status = 500;
      return {
        status: "error",
        message: error.message || "Internal server error",
        data: null,
      };
    }
  }, {
    body: t.Object({
      email: t.String({ format: "email" }),
      password: t.String({ minLength: 6 }),
    }),
    detail: {
      summary: "Login user",
      tags: ["Users"],
    }
  })
  .group("/users", (app) =>
    app
      .derive(async ({ headers }) => {
        const authorization = headers["authorization"];
        const token = (authorization && authorization.startsWith("Bearer ")) ? authorization.substring(7) : null;
        if (!token) {
          return { token: null, user: null };
        }
        const user = await usersService.getUserByToken(token);
        return { token, user };
      })
      .guard({
        beforeHandle({ user, set }) {
          if (!user) {
            set.status = 401;
            return {
              status: "error",
              message: "Unauthorized",
              data: null,
            };
          }
        }
      })
      .get("/me", async ({ user }) => {
        return {
          status: "success",
          message: "User fetched successfully",
          data: user,
        };
      }, {
        detail: {
          summary: "Get current user profile",
          tags: ["Users"],
          security: [{ bearerAuth: [] }],
        }
      })
      .delete("/logout", async ({ token }) => {
        await usersService.logout(token!);
        return {
          status: "success",
          message: "Logout successfully",
        };
      }, {
        detail: {
          summary: "Logout current user",
          tags: ["Users"],
          security: [{ bearerAuth: [] }],
        }
      })
  );
