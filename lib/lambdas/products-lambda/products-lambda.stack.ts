// Filename: products-lambda-stack.ts
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";
import { Construct } from "constructs";
import { TableNames } from "../../model/constants";

export class ProductsLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaFunction = new lambda.Function(this, "lambda-function", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "lambdas/products-lambda/handler.main",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../"), {
        exclude: ["node_modules", ".git", "*.md", "test", "bin", "cdk.out", ".gitignore"],
      }),
    });

    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:GetItem", "dynamodb:Scan", "dynamodb:PutItem"],
        resources: [
          `arn:aws:dynamodb:${this.region}:${this.account}:table/${TableNames.PRODUCTS}`,
        ],
      }),
    );

    const api = new apigateway.RestApi(this, "products-api", {
      restApiName: "Products API",
      description: "This API serves the Lambda functions for products.",
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.NONE,
        apiKeyRequired: false,
      },
      deployOptions: {
        stageName: "dev",
      },
    });

    const corsIntegrationResponse: apigateway.IntegrationResponse = {
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Origin": "'*'",
      },
    };

    const corsMethodResponse: apigateway.MethodResponse = {
      statusCode: "200",
      responseParameters: {
        "method.response.header.Access-Control-Allow-Origin": true,
      },
    };

    const getFromLambdaIntegration = new apigateway.LambdaIntegration(
      lambdaFunction,
      {
        requestTemplates: {
          "application/json": JSON.stringify({
            httpMethod: "$context.httpMethod",
            id: "$input.params('id')",
          }),
        },
        integrationResponses: [corsIntegrationResponse],
        proxy: false,
      },
    );

    const createFromLambdaIntegration = new apigateway.LambdaIntegration(
      lambdaFunction,
      {
        requestTemplates: {
          "application/json": `{
  "httpMethod": "$context.httpMethod",
  "body": $input.json('$')
}`,
        },
        integrationResponses: [corsIntegrationResponse],
        proxy: false,
      },
    );

    const preflightOptions: apigateway.CorsOptions = {
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
    };

    const productsResource = api.root.addResource("products");
    productsResource.addMethod("GET", getFromLambdaIntegration, {
      methodResponses: [corsMethodResponse],
    });
    productsResource.addMethod("POST", createFromLambdaIntegration, {
      methodResponses: [corsMethodResponse],
    });
    productsResource.addCorsPreflight(preflightOptions);

    const productByIdResource = productsResource.addResource("{id}");
    productByIdResource.addMethod("GET", getFromLambdaIntegration, {
      requestParameters: {
        "method.request.path.id": true,
      },
      methodResponses: [corsMethodResponse],
    });
    productByIdResource.addCorsPreflight(preflightOptions);
  }
}
