const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const { v4: uuidv4, v7: uuidv7 } = require("uuid");

// =====================================================================
// BAGIAN 1: PENGATURAN DATA MASTER & POLA PREDIKSI
// =====================================================================

// --- PENGATURAN UNTUK GENERATE DATA DINAMIS ---
const TOTAL_DAYS_TO_GENERATE = 365; // Data 1 tahun untuk menangkap pola siklus
const BASE_TRANSACTIONS_PER_DAY = 15;

// Pola Mingguan (Akhir pekan lebih ramai)
const WEEKLY_PATTERN = { 0: 1.6, 1: 0.8, 2: 0.9, 3: 1.0, 4: 1.2, 5: 1.8, 6: 2.0 };

// Pola Siklus Jangka Panjang (Tren bergelombang naik-turun per ~4 bulan)
const CYCLICAL_TREND_PERIOD_DAYS = 120;
const CYCLICAL_TREND_AMPLITUDE = 0.3; // Naik turun 30%

// Pola Lonjakan Gajian Bulanan (Tanggal 25-31 & 1-3)
const PAYDAY_SPIKE_MULTIPLIER = 1.5;

// Pola Acara Acak (Anomali penjualan tinggi/rendah)
const RANDOM_EVENT_CHANCE = 0.03; // Peluang 3%
const RANDOM_EVENT_MULTIPLIER_RANGE = { min: 0.4, max: 2.5 };


// Fungsi untuk membersihkan database sebelum seeding
async function cleanDatabase() {
  console.log("Membersihkan database lama...");
  // Hapus dalam urutan terbalik dari dependensi untuk menghindari error
  await prisma.order_details.deleteMany({});
  await prisma.orders.deleteMany({});
  await prisma.stock_cards.deleteMany({});
  await prisma.Notification.deleteMany({});
  await prisma.arima_predictions.deleteMany({});
  await prisma.items.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.outlets.deleteMany({});
  console.log("Database berhasil dibersihkan.");
}

// Fungsi untuk membuat data master
async function seedMasterData() {
  console.log("Memulai seeding data master (outlets, users, items)...");

  const outletsData = [
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

  const usersData = [
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

  const itemsData = [
    { id: "ITM0001", name: "Indomie Goreng", description: "Mi instan goreng", price: 3000, unit: "bungkus", stock: 250, outlet_id: "OUTL0002" },
    { id: "ITM0002", name: "Aqua 600ml", description: "Air mineral", price: 3500, unit: "botol", stock: 500, outlet_id: "OUTL0002" },
    { id: "ITM0003", name: "Chitato Sapi Panggang", description: "Keripik kentang", price: 10000, unit: "bungkus", stock: 150, outlet_id: "OUTL0002" },
    { id: "ITM0004", name: "Beras Rojolele 5kg", description: "Beras pulen", price: 65000, unit: "kg", stock: 50, outlet_id: "OUTL0001" },
    { id: "ITM0005", name: "Minyak Goreng 2L", description: "Minyak goreng sawit", price: 35000, unit: "liter", stock: 80, outlet_id: "OUTL0001" },
    { id: "ITM0006", name: "Telur Ayam Negeri 1kg", description: "Telur ayam per kilo", price: 28000, unit: "kg", stock: 40, outlet_id: "OUTL0002" },
    { id: "ITM0007", name: "Kopi Kapal Api Sachet", description: "Kopi hitam instan", price: 1500, unit: "sachet", stock: 1000, outlet_id: "OUTL0001" },
  ];

  for (const outlet of outletsData) {
    await prisma.outlets.create({ data: outlet });
  }
  for (const user of usersData) {
    await prisma.user.create({ data: user });
  }
  for (const item of itemsData) {
    await prisma.items.create({ data: item });
    await prisma.stock_cards.create({
      data: { id: uuidv4(), item_id: item.id, outlet_id: item.outlet_id, transaction_type: "initial_stock", transaction_id: item.id, stock_in: item.stock, stock_out: 0, current_stock: item.stock },
    });
  }
  console.log("Seeding data master selesai.");
}

// Fungsi untuk membuat data transaksi historis yang dinamis
async function seedDynamicOrders() {
  console.log(`\nMembuat data transaksi dinamis untuk ${TOTAL_DAYS_TO_GENERATE} hari terakhir...`);

  // Ambil data master yang baru saja dibuat untuk referensi
  const items = await prisma.items.findMany();
  const kasirUsers = await prisma.user.findMany({ where: { role: "KASIR" } });
  const outlets = await prisma.outlets.findMany();

  for (let i = TOTAL_DAYS_TO_GENERATE; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(10, 0, 0, 0);
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    let logMessage = "";

    // Hitung semua faktor pengali
    const weeklyMultiplier = WEEKLY_PATTERN[dayOfWeek];
    const dayCounter = TOTAL_DAYS_TO_GENERATE - i;
    const cyclicalMultiplier = 1.0 + CYCLICAL_TREND_AMPLITUDE * Math.sin((dayCounter / CYCLICAL_TREND_PERIOD_DAYS) * 2 * Math.PI);
    let paydayMultiplier = 1.0;
    if ((dayOfMonth >= 25 && dayOfMonth <= 31) || (dayOfMonth >= 1 && dayOfMonth <= 3)) {
      paydayMultiplier = PAYDAY_SPIKE_MULTIPLIER;
      logMessage += " - Lonjakan Gajian!";
    }
    let eventMultiplier = 1.0;
    if (Math.random() < RANDOM_EVENT_CHANCE) {
      const { min, max } = RANDOM_EVENT_MULTIPLIER_RANGE;
      eventMultiplier = min + Math.random() * (max - min);
      logMessage += ` - Acara Acak! (x${eventMultiplier.toFixed(1)})`;
    }

    // Gabungkan semua faktor untuk menentukan jumlah transaksi hari ini
    let targetTransactions = BASE_TRANSACTIONS_PER_DAY * weeklyMultiplier * cyclicalMultiplier * paydayMultiplier * eventMultiplier;
    const transactionsPerDay = Math.max(5, Math.round(targetTransactions));

    for (let j = 0; j < transactionsPerDay; j++) {
      const orderId = "ORD-" + uuidv7();
      const publicId = `ORD-SEED-${date.toISOString().slice(0, 10)}-${j + 1}`;
      let totalOrderPayment = 0;
      const orderDetailsToCreate = [];
      const itemsPerTransaction = Math.floor(Math.random() * 5) + 1;
      const shuffledItems = [...items].sort(() => 0.5 - Math.random());
      const selectedItems = shuffledItems.slice(0, itemsPerTransaction);

      for (const item of selectedItems) {
        const quantity = Math.floor(Math.random() * 3) + 1;
        const totalPrice = item.price * quantity;
        totalOrderPayment += totalPrice;
        orderDetailsToCreate.push({
          id: "ORDD-" + uuidv7(),
          item_id: item.id,
          price: item.price,
          quantity: quantity,
          total_price: totalPrice,
        });
      }

      const randomKasir = kasirUsers[Math.floor(Math.random() * kasirUsers.length)];
      const randomOutlet = outlets[Math.floor(Math.random() * outlets.length)];

      await prisma.orders.create({
        data: {
          id: orderId, public_id: publicId, outlet_id: randomOutlet.id, user_id: randomKasir.id, amount: totalOrderPayment, total_payment: totalOrderPayment, status: "success", created_at: date, order_details: { create: orderDetailsToCreate },
        },
      });
    }

    if (i % 10 === 0 || i < 5) { // Log setiap 10 hari atau 5 hari terakhir
      const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      console.log(`[${(dayCounter).toString().padStart(3, ' ')}] Tgl: ${date.toISOString().slice(0, 10)} (${dayNames[dayOfWeek]}) - Jml Transaksi: ${transactionsPerDay}${logMessage}`);
    }
  }
  console.log("\nSeeding data transaksi historis DINAMIS berhasil diselesaikan.");
}

// =====================================================================
// BAGIAN 2: EKSEKUSI UTAMA
// =====================================================================

async function main() {
  console.log("Memulai proses seeding data lengkap...");

  await cleanDatabase();
  await seedMasterData();
  await seedDynamicOrders();

  console.log("\n✅ ✅ ✅ Proses seeding data lengkap telah berhasil diselesaikan! ✅ ✅ ✅");
}

main()
  .catch((e) => {
    console.error("Terjadi error saat proses seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });