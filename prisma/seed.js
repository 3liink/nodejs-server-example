const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()
async function main() {
  await prisma.User.create({
    data: {
      email: "areephak.a@gmail.com",
      password: "$2b$10$U9VabhHIM.989CDR46epVOxS7pcDSNDzZloRmUsKKJY.RUxsbkhTq",
      role: "ADMIN",
      name: "Aekkarach Areephak",
    },
  })
}
main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
