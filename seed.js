const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

async function main() {
  const outlets = [
    {
      id: "OUTL0001",
      name: "Bandung",
      address: "123 Main St",
      phone: "1234567890",
      email: "bandung@example.com",
      created_at: new Date("2023-01-15"),
    },
    {
      id: "OUTL0002",
      name: "Jakarta",
      address: "456 Elm St",
      phone: "0987654321",
      email: "jakarta@example.com",
      created_at: new Date("2023-02-15"),
    },
    {
      id: "OUTL0003",
      name: "Surabaya",
      address: "789 Oak St",
      phone: "2233445566",
      email: "surabaya@example.com",
      created_at: new Date("2023-03-15"),
    },
    {
      id: "OUTL0004",
      name: "Purbalingga",
      address: "Jl Serayu no 104, Mrebet, Purbalingga",
      phone: "085895421884",
      email: "jawashop@gmail.com",
      created_at: new Date("2023-03-15"),
    },
  ];

  const items = [
    {
      id: "ITM0011",
      name: "Indomie Goreng",
      description: "Mi instan goreng",
      price: 3000,
      unit: "bungkus",
      stock: 100,
      outlet_id: "OUTL0002",
      created_at: new Date("2023-01-15"),
    },
    {
      id: "ITM0012",
      name: "Aqua 600ml",
      description: "Air mineral",
      price: 3500,
      unit: "botol",
      stock: 200,
      outlet_id: "OUTL0002",
      created_at: new Date("2023-02-15"),
    },
    {
      id: "ITM0013",
      name: "Chitato Sapi Panggang",
      description: "Keripik kentang rasa sapi panggang",
      price: 10000,
      unit: "bungkus",
      stock: 50,
      outlet_id: "OUTL0002",
      created_at: new Date("2023-03-15"),
    },
    {
      id: "ITM0014",
      name: "Beras Rojolele 5kg",
      description: "Beras pulen dan wangi",
      price: 65000,
      unit: "kg",
      stock: 20,
      outlet_id: "OUTL0002",
      created_at: new Date("2023-04-15"),
    },
    {
      id: "ITM0015",
      name: "Minyak Goreng Sania 2L",
      description: "Minyak goreng kelapa sawit",
      price: 35000,
      unit: "liter",
      stock: 30,
      outlet_id: "OUTL0002",
      created_at: new Date("2023-05-15"),
    },
  ];

  const users = [
    {
      id: "USR0024",
      name: "Dina",
      email: "dina@example.com",
      password: await bcrypt.hash("password1", 10),
      role: "ADMIN",
      outlet_id: null,
      created_at: new Date("2023-01-15"),
    },
    {
      id: "USR0025",
      name: "Yunif",
      email: "yunif@example.com",
      password: await bcrypt.hash("password2", 10),
      role: "STAFF",
      outlet_id: "OUTL0002",
      created_at: new Date("2023-02-15"),
    },
    {
      id: "USR0026",
      name: "Jiad",
      email: "jiad@example.com",
      password: await bcrypt.hash("password3", 10),
      role: "KASIR",
      outlet_id: "OUTL0002",
      created_at: new Date("2023-03-15"),
    },
    {
      id: "USR0027",
      name: "Advie",
      email: "advie@example.com",
      password: await bcrypt.hash("password4", 10),
      role: "STAFF",
      outlet_id: "OUTL0001",
      created_at: new Date("2023-04-15"),
    },
  ];
  for (const outlet of outlets) {
    await prisma.outlets.upsert({
      where: { id: outlet.id },
      update: {},
      create: outlet,
    });
  }

  for (const item of items) {
    await prisma.items.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });

    await prisma.stock_cards.create({
      data: {
        id: uuidv4(),
        item_id: item.id,
        outlet_id: item.outlet_id,
        transaction_type: "initial_stock",
        transaction_id: item.id,
        stock_in: item.stock,
        stock_out: 0,
        current_stock: item.stock, // Initialize current_stock with the initial stock
        created_at: item.created_at,
      },
    });
  }

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }
  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });