// Filename: handler.ts
import { SQSEvent } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { MessageAttributeValue } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({});

export async function main(event: SQSEvent) {
  const { Records } = event;

  for (const record of Records) {
    console.log("Received message:", record.body);

    const product = JSON.parse(record.body);

    await snsClient.send(
      new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Subject: "Product created",
        Message: JSON.stringify(product),
        MessageAttributes: {
          price: {
            DataType: "Number",
            StringValue: String(product.price),
          },
          title: {
            DataType: "String",
            StringValue: product.title,
          },
          count: {
            DataType: "Number",
            StringValue: String(product.count),
          },
        },
      })
    );

    console.log("Published product to SNS:", product);
  }
}
