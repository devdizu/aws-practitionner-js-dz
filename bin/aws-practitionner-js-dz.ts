#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { ProductsTablesStack } from "../lib/db/products-tables/products-tables.stack";
import { ProductsServiceStack } from "../lib/stacks/products-service/products-service.stack";
import { ImportServiceStack } from "../lib/stacks/import-service/import-service-stack";
import { CatalogBatchProcessSqsStack } from "../lib/stacks/catalog-batch-process-sqs/catalog-batch-process-sqs.stack";
import { ProductSnsStack } from "../lib/stacks/products-sns/products-sns.stack";

const app = new cdk.App();

new ProductsServiceStack(app, "ProductsServiceStack", {});
new ProductsTablesStack(app, "ProductsTablesStack", {});
const productSnsStack = new ProductSnsStack(app, "ProductSnsStack", {});
const catalogBatchProcessSqsStack = new CatalogBatchProcessSqsStack(app, "CatalogBatchProcessSqsStack", {
	createProductTopic: productSnsStack.createProductTopic,
});
new ImportServiceStack(app, "ImportServiceStack", {
	catalogItemsQueue: catalogBatchProcessSqsStack.catalogItemsQueue,
});