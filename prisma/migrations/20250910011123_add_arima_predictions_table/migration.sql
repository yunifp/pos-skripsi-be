-- CreateTable
CREATE TABLE "arima_predictions" (
    "id" TEXT NOT NULL,
    "prediction_date" DATE NOT NULL,
    "prediction_value" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arima_predictions_pkey" PRIMARY KEY ("id")
);
