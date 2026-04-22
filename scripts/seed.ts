import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

// Configuración de cliente DynamoDB
const dynamoDBClientConfig = {
  region: process.env.AWS_REGION,
};

const client = new DynamoDBClient(dynamoDBClientConfig);
const docClient = DynamoDBDocumentClient.from(client);

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
}

interface Stock {
  product_id: string;
  quantity: number;
  warehouse: string;
  lastUpdated: string;
}

// Datos de prueba para Products
const productsData: Product[] = [
  {
    id: uuidv4(),
    title: "Nike Air Max",
    description: "Premium running shoes with advanced cushioning",
    price: 150,
  },
  {
    id: uuidv4(),
    title: "Adidas Ultraboost",
    description: "Lightweight and responsive running shoes",
    price: 180,
  },
  {
    id: uuidv4(),
    title: "Puma RS-X",
    description: "Retro style sneakers with modern comfort",
    price: 110,
  },
  {
    id: uuidv4(),
    title: "New Balance 990v5",
    description: "Classic comfort shoe for everyday wear",
    price: 185,
  },
  {
    id: uuidv4(),
    title: "Reebok Classic Leather",
    description: "Timeless design with superior comfort",
    price: 95,
  },
];

// Generar datos de Stock basados en Products
const stockData: Stock[] = productsData.map((product) => ({
  product_id: product.id,
  quantity: Math.floor(Math.random() * 100) + 10,
  warehouse: ["New York", "Los Angeles", "Chicago"][
    Math.floor(Math.random() * 3)
  ],
  lastUpdated: new Date().toISOString(),
}));

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seed...\n");

    // Insertar Products
    console.log("📦 Inserting Products...");
    for (const product of productsData) {
      await docClient.send(
        new PutCommand({
          TableName: "Products",
          Item: product,
        }),
      );
      console.log(`   ✓ Inserted product: ${product.title} (${product.id})`);
    }
    console.log(`✅ Inserted ${productsData.length} products\n`);

    // Insertar Stock
    console.log("📊 Inserting Stock entries...");
    for (const stock of stockData) {
      const product = productsData.find((p) => p.id === stock.product_id);
      await docClient.send(
        new PutCommand({
          TableName: "Stock",
          Item: stock,
        }),
      );
      console.log(
        `   ✓ Inserted stock: ${stock.quantity} units (Product: ${product?.title}, Warehouse: ${stock.warehouse})`,
      );
    }
    console.log(`✅ Inserted ${stockData.length} stock entries\n`);

    console.log("🎉 Database seeding completed successfully!");
    console.log(`
Summary:
--------
✓ Products: ${productsData.length}
✓ Stock entries: ${stockData.length}
✓ Product IDs have been linked to Stock entries
`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedDatabase();
