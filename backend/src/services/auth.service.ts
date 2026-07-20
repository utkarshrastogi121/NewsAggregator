import bcrypt from "bcrypt";
import { prisma } from "../utils/prisma";
import { generateToken } from "../utils/jwt";

export class AuthService {
  static async register(email: string, password: string) {
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },

      select: {
        id: true,
        email: true,
      },
    });

    const token = generateToken(user.id);

    return {
      user,
      token,
    };
  }

  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    const token = generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
      },

      token,
    };
  }
}
