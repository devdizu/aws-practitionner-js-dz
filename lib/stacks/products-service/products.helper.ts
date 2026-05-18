import { TableNames } from "../../model/constants";
import { Product } from "../../model/product.interface";
import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
  TransactGetItemsCommand,
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";
import { ProductWithCount } from "../../model/products.model";

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

function mapDynamoDBItemToProduct(item: Record<string, any>): Product {
  return {
    id: item.id.S,
    title: item.title.S,
    description: item.description.S,
    price: Number(item.price.N),
  };
}

export function getProducts() {
  return dynamoDB.send(
    new ScanCommand({
      TableName: TableNames.PRODUCTS,
    }),
  ).then((result) => {
    return result.Items?.map((item) => mapDynamoDBItemToProduct(item)) as Product[];
  });
}

export async function getProductById(id: string): Promise<ProductWithCount> {
  const { Responses } = await dynamoDB.send(
    new TransactGetItemsCommand({
      TransactItems: [
        {
          Get: {
            TableName: TableNames.PRODUCTS,
            Key: { id: { S: id } },
          },
        },
        {
          Get: {
            TableName: TableNames.STOCK,
            Key: { product_id: { S: id } },
          },
        },
      ],
    }),
  );

  const productItem = Responses?.[0]?.Item;
  if (!productItem) {
    throw new Error(`Product with id ${id} not found`, { cause: { statusCode: 404 } });
  }

  const stockItem = Responses?.[1]?.Item;

  return {
    ...mapDynamoDBItemToProduct(productItem),
    count: Number(stockItem?.quantity?.N ?? 0),
  } as ProductWithCount;
}

export async function createProduct(
  payload: Omit<Product, "id">,
): Promise<Product> {
  const title = payload?.title?.trim();
  const description = payload?.description?.trim();
  const price = payload?.price;

  if (
    !title ||
    !description ||
    typeof price !== "number" ||
    Number.isNaN(price) ||
    price <= 0
  ) {
    throw new Error(
      "title, description and price are required, and price must be greater than 0",
      { cause: { statusCode: 400 } },
    );
  }

  const newProduct: Product = {
    id: randomUUID(),
    title,
    description,
    price,
  };

  await dynamoDB.send(
    new PutItemCommand({
      TableName: TableNames.PRODUCTS,
      Item: {
        id: { S: newProduct.id },
        title: { S: newProduct.title },
        description: { S: newProduct.description },
        price: { N: newProduct.price.toString() },
      },
    }),
  );

  return newProduct;
}
