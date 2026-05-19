// Filename: handler.ts

import { logRequest } from "../../util/logger.service";
import { createProduct, getProductById, getProducts } from "./products.service";

export async function main(event: any) {
  try {
    const httpMethod = event?.httpMethod || event?.requestContext?.http?.method;
    const path = event?.path || event?.requestContext?.http?.path || "/";
    logRequest(httpMethod, path);

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
  } catch (error) {
    const statusCode = (error as { cause?: { statusCode?: number } })?.cause?.statusCode || 500;
    const message = error instanceof Error ? error.message : "Internal server error";

    return {
      statusCode,
      message,
    };
  }
}
