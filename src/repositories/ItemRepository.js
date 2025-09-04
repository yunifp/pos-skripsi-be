const prisma = require("../db");

const generateNextItemId = async () => {
  const epochTime = Date.now();
  const nextReceptionId = `ITM${epochTime}`;
  return nextReceptionId;
};

const createItem = async (itemData) => {
  try {
    const itemId = await generateNextItemId();
    const item = await prisma.items.create({
      data: {
        id: itemId,
        name: itemData.name,
        description: itemData.description,
        price: parseInt(itemData.price, 10),
        unit: itemData.unit,
        stock: itemData.stock,
        outlet: {
          connect: { id: itemData.outlet_id },
        },
      },
    });
    return item;
  } catch (error) {
    throw new Error(JSON.stringify({ status: 500, message: error.message }));
  }
};

const findItemById = async (itemId) => {
  try {
    const item = await prisma.items.findUnique({
      where: {
        id: itemId,
      },
      include: {
        outlet: true,
      },
    });
    return item;
  } catch (error) {
    throw new Error(JSON.stringify({ status: 500, message: error.message }));
  }
};

const get = async (skip, pageSize, search, sortBy, outletId) => {
  try {
    const searchConditions = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];

    const validUnit = [
      "pil",
      "kapsul",
      "tablet",
      "sirup",
      "salep",
      "gel",
      "injeksi",
    ]; // Replace with your actual roles
    if (validUnit.includes(search)) {
      searchConditions.push({ unit: { equals: search } });
    }

    const orderBy = {};
    if (typeof sortBy === "string" && sortBy.includes(":")) {
      const [field, direction] = sortBy.split(":");
      orderBy[field] = direction.toLowerCase();
    } else {
      // Default sorting if sortBy is not provided or invalid
      orderBy["created_at"] = "desc";
    }

    const whereConditions = {
      deleted: false,
      OR: searchConditions,
    };

    if (outletId) {
      whereConditions.outlet_id = outletId;
    }

    const items = await prisma.items.findMany({
      where: whereConditions,
      include: {
        outlet: true,
      },
      orderBy: orderBy,
      skip: skip,
      take: pageSize,
    });
    return items;
  } catch (error) {
    throw new Error(error.message);
  } finally {
    await prisma.$disconnect();
  }
};

const updateItem = async (itemId, itemData) => {
  const item = await prisma.items.update({
    where: {
      id: itemId,
    },
    data: itemData,
    include: {
      outlet: true,
    },
  });

  return item;
};

const deleteItem = async (itemId) => {
  const item = await prisma.items.update({
    where: {
      id: itemId,
    },
    data: {
      deleted: true,
    },
  });

  return item;
};

const toggleDeleteItem = async (itemId) => {
  const item = await prisma.items.findUnique({
    where: {
      id: itemId,
    },
  });

  if (!item) {
    throw new Error("data not found");
  }

  const updatedItem = await prisma.items.update({
    where: {
      id: itemId,
    },
    data: {
      deleted: !item.deleted,
    },
  });

  return updatedItem;
};

const count = async () => {
  try {
    const items = await prisma.items.count({
      where: { deleted: false },
    });
    return items;
  } catch (error) {
    throw new Error(error.message);
  } finally {
    prisma.$disconnect();
  }
};

const getLowStockItems = async (skip, pageSize, search, sortBy, outletId) => {
  try {
    const searchConditions = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];

    const orderBy = {};
    if (typeof sortBy === "string" && sortBy.includes(":")) {
      const [field, direction] = sortBy.split(":");
      orderBy[field] = direction.toLowerCase();
    } else {
      // Default sorting if sortBy is not provided or invalid
      orderBy["created_at"] = "desc";
    }

    const whereConditions = {
      stock: {
        lt: 21,
      },
      deleted: false,
      OR: searchConditions,
    };

    if (outletId) {
      whereConditions.outlet_id = outletId;
    }

    const items = await prisma.items.findMany({
      where: whereConditions,
      include: {
        outlet: true,
      },
      orderBy: orderBy,
      skip: skip,
      take: pageSize,
    });
    return items;
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  createItem,
  get,
  findItemById,
  deleteItem,
  updateItem,
  toggleDeleteItem,
  count,
  getLowStockItems
};
