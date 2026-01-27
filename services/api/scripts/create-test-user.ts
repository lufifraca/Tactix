import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

async function main() {
  const JWT_SECRET = process.env.JWT_SECRET || "dev_change_me";

  // Create or find test user
  let user = await prisma.user.findUnique({
    where: { email: "test@tactix.local" },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "test@tactix.local",
        displayName: "Test User",
        avatarUrl: null,
      },
    });
    console.log("✅ Created test user:", user.email);
  } else {
    console.log("✅ Test user already exists:", user.email);
  }

  // Generate JWT token
  const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "30d" });

  console.log("\n📋 COPY THIS TOKEN TO YOUR BROWSER:");
  console.log("\n1. Open Developer Tools (F12)");
  console.log("2. Go to Application/Storage > Cookies > http://localhost:3000");
  console.log("3. Add a new cookie:");
  console.log("   Name: tx_session");
  console.log(`   Value: ${token}`);
  console.log("   Domain: localhost");
  console.log("   Path: /");
  console.log("\n4. Refresh the page and go to /dashboard");
  console.log("\nOr use this curl command to test:");
  console.log(`\ncurl -H "Cookie: tx_session=${token}" http://localhost:3001/dashboard\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
