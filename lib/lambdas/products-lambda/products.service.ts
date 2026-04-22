import { TableNames } from "../../model/constants";
import { Product } from "../../model/product.interface";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

export function getProducts() {
  return dynamoDB.send(
    new ScanCommand({
      TableName: TableNames.PRODUCTS,
    }),
  ).then((result) => {
    return result.Items?.map((item) => ({
      id: item.id.S,
      title: item.title.S,
      description: item.description.S,
      price: Number(item.price.N),
    })) as Product[];
  });
}

export async function getProductById(id: string) {
  const result = await dynamoDB.send(
    new GetItemCommand({
      TableName: TableNames.PRODUCTS,
      Key: {
        id: { S: id },
      },
    }),
  );

  if (!result.Item) {
    throw new Error(`Product with id ${id} not found`, { cause: { statusCode: 404 } });
  }

  return {
    id: result.Item.id.S,
    title: result.Item.title.S,
    description: result.Item.description.S,
    price: Number(result.Item.price.N),
  } as Product;
}

export async function createProduct(
  payload: Omit<Product, "id">,
): Promise<Product> {
  if (!payload?.title || !payload?.description || typeof payload?.price !== "number") {
    throw new Error("Invalid product payload", { cause: { statusCode: 400 } });
  }

  const newProduct: Product = {
    id: randomUUID(),
    title: payload.title,
    description: payload.description,
    price: payload.price,
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
