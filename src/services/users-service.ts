import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export class UsersService {
  /**
   * Check if a user with the given email already exists
   */
  async findByEmail(email: string) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  }

  /**
   * Register a new user
   */
  async register(data: { name: string; email: string; password: string }) {
    // Check if email already exists
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      return null;
    }

    // Hash the password using Bun's native bcrypt utility (cost = 10)
    const hashedPassword = await Bun.password.hash(data.password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    // Insert user into database
    await db.insert(users).values({
      name: data.name,
      email: data.email,
      password: hashedPassword,
    });

    // Fetch the created user to return it
    const newUser = await this.findByEmail(data.email);
    if (!newUser) {
      throw new Error("Failed to retrieve created user");
    }

    // Omit password from the returned object
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }
}

export const usersService = new UsersService();
