import { db } from "../db";
import { users, sessions } from "../db/schema";
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

  /**
   * Login user and create session
   */
  async login(data: { email: string; password: string }) {
    // 1. Find user by email
    const user = await this.findByEmail(data.email);
    if (!user) {
      return null;
    }

    // 2. Verify password using Bun's native password verifier
    const isPasswordValid = await Bun.password.verify(data.password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // 3. Generate secure session token (UUID v4)
    const token = crypto.randomUUID();

    // 4. Save session to database
    await db.insert(sessions).values({
      token,
      userId: user.id,
    });

    return token;
  }

  /**
   * Get user profile by session token
   */
  async getUserByToken(token: string) {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.token, token))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Logout user by session token
   */
  async logout(token: string) {
    const user = await this.getUserByToken(token);
    if (!user) {
      return false;
    }

    await db.delete(sessions).where(eq(sessions.token, token));
    return true;
  }
}

export const usersService = new UsersService();
