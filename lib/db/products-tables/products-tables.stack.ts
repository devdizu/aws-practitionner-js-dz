// Filename: products/ProductsTablesStack.ts
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { TableNames } from "../../model/constants";

export class ProductsTablesStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new dynamodb.Table(this, TableNames.PRODUCTS, {
      tableName: TableNames.PRODUCTS,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
    });

    new dynamodb.Table(this, TableNames.STOCK, {
      tableName: TableNames.STOCK,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "product_id",
        type: dynamodb.AttributeType.STRING,
      },
    });
  }
}
