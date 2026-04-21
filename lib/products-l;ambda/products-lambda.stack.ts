// Filename: products-lambda-stack.ts
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { Construct } from "constructs";

export class ProductsLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaFunction = new lambda.Function(this, "lambda-function", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handler.main",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
    });

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

    const helloFromLambdaIntegration = new apigateway.LambdaIntegration(
      lambdaFunction,
      {
        requestTemplates: {
          "application/json": JSON.stringify({
            id: "$input.params('id')",
          }),
        },
        integrationResponses: [corsIntegrationResponse],
        proxy: false,
      },
    );

    const preflightOptions: apigateway.CorsOptions = {
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
    };

    const productsResource = api.root.addResource("products");
    productsResource.addMethod("GET", helloFromLambdaIntegration, {
      methodResponses: [corsMethodResponse],
    });
    productsResource.addCorsPreflight(preflightOptions);

    const productByIdResource = productsResource.addResource("{id}");
    productByIdResource.addMethod("GET", helloFromLambdaIntegration, {
      requestParameters: {
        "method.request.path.id": true,
      },
      methodResponses: [corsMethodResponse],
    });
    productByIdResource.addCorsPreflight(preflightOptions);
  }
}
