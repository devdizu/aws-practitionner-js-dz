// Filename: handler.ts

import { createProduct, getProductById, getProducts } from "./products.service";

export async function main(event: any) {
  const httpMethod = event?.httpMethod || event?.requestContext?.http?.method;

  if (httpMethod === "POST") {
    const body =
      typeof event?.body === "string" ? JSON.parse(event.body || "{}") : event?.body;

    return await createProduct(body);
  }

  const id = event?.id || event?.pathParameters?.id;
  if (id) {
    return await getProductById(id);
  }
  return await getProducts();
}
