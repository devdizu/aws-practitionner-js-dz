#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { ProductsTablesStack } from "../lib/db/products-tables/products-tables.stack";
import { ProductsServiceStack } from "../lib/stacks/products-service/products-service.stack";
import { ImportServiceStack } from "../lib/stacks/import-service/import-service-stack";
import { ProductSqsStack } from "../lib/stacks/products-sqs/products-sqs.stack";
import { ProductSnsStack } from "../lib/stacks/products-sns/products-sns.stack";

const app = new cdk.App();

new ProductsServiceStack(app, "ProductsServiceStack", {});
new ProductsTablesStack(app, "ProductsTablesStack", {});
new ImportServiceStack(app, "ImportServiceStack", {});
new ProductSqsStack(app, "ProductSqsStack", {});
new ProductSnsStack(app, "ProductSnsStack", {});