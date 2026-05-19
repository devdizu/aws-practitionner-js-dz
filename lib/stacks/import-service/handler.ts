// Filename: handler.ts

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import csv from "csv-parser";
import type { Product } from "../../model/products.model";
import { logRequest } from "../../util/logger.service";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

type ProductCsvInput = Omit<Product, "id">;

type S3ObjectLocation = {
  bucket: string;
  key: string;
};

function getCatalogItemsQueueUrl(): string {
  const queueUrl = process.env.CATALOG_ITEMS_QUEUE_URL;
  if (!queueUrl) {
    throw new Error("CATALOG_ITEMS_QUEUE_URL is not configured", {
      cause: { statusCode: 500 },
    });
  }

  return queueUrl;
}

async function sendProductToCatalogQueue(productRow: ProductCsvInput): Promise<void> {
  const queueUrl = getCatalogItemsQueueUrl();
  const payload = {
    ...productRow,
    price: Number(productRow.price),
  };

  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
    }),
  );
}

function validateProductCsvRow(
  row: Record<string, unknown>,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const title = row.title;
  const description = row.description;
  const price = row.price;

  if (typeof title !== "string" || title.trim().length === 0) {
    errors.push("title is required and must be a non-empty string");
  }

  if (typeof description !== "string" || description.trim().length === 0) {
    errors.push("description is required and must be a non-empty string");
  }

  const numericPrice = Number(price);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    errors.push("price is required and must be a non-negative number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

  
function getS3ObjectLocation(record: any): S3ObjectLocation | null {
  const bucket = record?.s3?.bucket?.name;
  const key = decodeURIComponent(record?.s3?.object?.key?.replace(/\+/g, " "));

  if (!bucket || !key) {
    console.warn("Invalid S3 event structure:", { bucket, key });
    return null;
  }

  return { bucket, key };
}

async function parseS3Object(bucket: string, key: string): Promise<void> {

  console.log(`Processing file from S3: s3://${bucket}/${key}`);

  const getCommand = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(getCommand);
  const stream = response.Body as Readable;

  await new Promise((resolve, reject) => {
    let rowCount = 0;
    const invalidRows: string[] = [];
    const enqueueJobs: Promise<void>[] = [];

    stream
      .pipe(csv())
      .on("data", (row: any) => {
        rowCount++;
        const productRow = row as ProductCsvInput;
        const validation = validateProductCsvRow(productRow);

        if (!validation.isValid) {
          invalidRows.push(
            `Row ${rowCount}: ${validation.errors.join(", ")}`,
          );
          return;
        }

        enqueueJobs.push(sendProductToCatalogQueue(productRow));
        console.log(`[Row ${rowCount}]`, JSON.stringify(productRow));
      })
      .on("end", async () => {
        try {
          if (invalidRows.length > 0) {
            const validationError =
              `CSV validation failed for ${key}. ` +
              `Invalid rows: ${invalidRows.join(" | ")}`;
            console.error(validationError);
            reject(new Error(validationError));
            return;
          }

          await Promise.all(enqueueJobs);
          console.log(
            `File processing completed: ${rowCount} rows parsed from ${key}`
          );
          resolve(undefined);
        } catch (error) {
          reject(error);
        }
      })
      .on("error", (error: Error) => {
        console.error(`Error parsing CSV from ${key}:`, error.message);
        reject(error);
      });
  });
}

async function moveS3ObjectToParsed(bucket: string, key: string): Promise<void> {
  const parsedKey = key.startsWith("uploaded/")
    ? key.replace("uploaded/", "parsed/")
    : `parsed/${key.split("/").pop()}`;

  await s3Client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${key}`,
      Key: parsedKey,
    }),
  );

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  console.log(`File moved from ${key} to ${parsedKey}`);
}

export async function create(event: any) {
  try {
    const filename = event?.filename || event?.pathParameters?.filename;
    logRequest(event?.httpMethod, `${event?.path || "/import"}`);

    if (!filename) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "filename parameter is required",
        }),
      };
    }

    const bucketName = process.env.IMPORT_SERVICE_BUCKET;
    if (!bucketName) {
      throw new Error("IMPORT_SERVICE_BUCKET is not configured", {
        cause: { statusCode: 500 },
      });
    }
    const objectKey = `uploaded/${filename}`;

    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    const signedUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: 3600, // URL expires in 1 hour
    });

    return {
      message: "Signed URL created successfully",
      signedUrl: signedUrl,
      key: objectKey,
      bucket: bucketName,
    };
  } catch (error) {
    const statusCode =
      (error as { cause?: { statusCode?: number } })?.cause?.statusCode || 500;
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return {
      statusCode,
      body: JSON.stringify({ message }),
    };
  }
}


export async function parse(event: any) {
  try {
    logRequest("S3:ObjectCreated", "/parse");

    // Extract bucket and key from S3 event
    const records = event?.Records || [];
    if (records.length === 0) {
      console.log("No S3 records found in event");
      return {
        statusCode: 400,
        message: "No S3 records found in event",
      };
    }

    const recordCount = records.length;
    console.log(`Processing ${recordCount} S3 event(s)`);

    for (const record of records) {
      const objectLocation = getS3ObjectLocation(record);
      if (!objectLocation) {
        continue;
      }

      await parseS3Object(objectLocation.bucket, objectLocation.key);
      await moveS3ObjectToParsed(objectLocation.bucket, objectLocation.key);
    }

    return {
      statusCode: 200,
      message: "Files parsed successfully",
      recordsProcessed: recordCount,
    };
  } catch (error) {
    const statusCode =
      (error as { cause?: { statusCode?: number } })?.cause?.statusCode || 500;
    const message =
      error instanceof Error ? error.message : "Internal server error";

    console.error("Parse error:", message);

    return {
      statusCode,
      message,
    };
  }
}
