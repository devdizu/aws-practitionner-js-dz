// Filename: handler.ts

import { getProductById, getProducts } from "./products.service";

export async function main(event: any) {
  const id = event?.id || event?.pathParameters?.id;
  if (id) {
    return await getProductById(parseInt(id));
  }
  return await getProducts();
}
