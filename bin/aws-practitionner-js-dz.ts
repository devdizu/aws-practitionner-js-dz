#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { ProductsLambdaStack } from "../lib/lambdas/products-lambda/products-lambda.stack";
import { ProductsTablesStack } from "../lib/db/products-tables/products-tables.stack";

const app = new cdk.App();

new ProductsLambdaStack(app, "ProductsLambdaStack", {});
new ProductsTablesStack(app, "ProductsTablesStack", {});