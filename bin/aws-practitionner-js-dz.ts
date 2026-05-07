#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { ProductsTablesStack } from "../lib/db/products-tables/products-tables.stack";
import { ProductsServiceStack } from "../lib/services/products-service/products-service.stack";
import { ImportServiceStack } from "../lib/services/import-service/import-service-stack";

const app = new cdk.App();

new ProductsServiceStack(app, "ProductsServiceStack", {});
new ProductsTablesStack(app, "ProductsTablesStack", {});
new ImportServiceStack(app, "ImportServiceStack", {});