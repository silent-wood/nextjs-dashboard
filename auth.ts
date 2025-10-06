import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod'; 
import type { User } from "@/app/lib/definitions";
import bcrypt from 'bcrypt';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: true });

async function getUser(email: string): Promise<User | undefined>  {
  try {
    const user = await sql<User[]>`SELECT * FROM users WHERE email = ${email}`
    return user[0]
  } catch (error) {
    console.error('查找用户失败:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      // 身份验证逻辑
      async authorize(credentials) {
        // 使用zod验证
        const parsedCredentials = z
          .object({ 
            email: z.string().email(),
            password: z.string().min(6)
          })
          .safeParse(credentials);
        // 验证成功后把数据和数据库的数据进行对比
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user
        }
        return null
      }
    })
  ]
})