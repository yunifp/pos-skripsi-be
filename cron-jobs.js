const cron = require("node-cron");
const { trainAndPredictARIMAService } = require("./src/services/predictionService");

// Jalankan setiap hari Minggu pukul 01:00
cron.schedule("0 1 * * 0", async () => {
  console.log("Menjalankan cron job untuk prediksi ARIMA...");
  try {
    await trainAndPredictARIMAService();
    console.log("Prediksi ARIMA berhasil diperbarui.");
  } catch (error) {
    console.error("Gagal menjalankan cron job prediksi ARIMA:", error);
  }
});