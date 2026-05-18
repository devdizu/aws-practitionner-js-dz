// Filename: basic-authorizer-stack.ts
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";

export class BasicAuthorizerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaFunction = new lambda.Function(this, "lambda-function", {
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handler.main",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
      environment: {
        Diego: "TEST_PASSWORD",
      },
    });

    const userPool = new cognito.UserPool(this, "my-user-pool", {
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        familyName: {
          mutable: true,
          required: true,
        },
        phoneNumber: { required: false },
      },
      customAttributes: {
        createdAt: new cognito.DateTimeAttribute(),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: false,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const appClient = userPool.addClient("my-app-client", {
      userPoolClientName: "auth-app-client",
      authFlows: {
        userPassword: true,
      },
    });

    const api = new apigateway.RestApi(this, "my-api", {
      restApiName: "Authorization API Gateway",
      description: "This API serves the Lambda functions for Auth",
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "basic-authorizer",
      {
        authorizerName: "basic-authorizer",
        cognitoUserPools: [userPool],
      },
    );

    const helloFromLambdaIntegration = new apigateway.LambdaIntegration(
      lambdaFunction,
      {
        requestTemplates: {
          "application/json": `{ "message": "$input.params('message')" }`,
        },
        integrationResponses: [
          {
            statusCode: "200",
          },
        ],
        proxy: false,
      },
    );

    // Create a resource /hello and GET request under it
    const helloResource = api.root.addResource("hello");
    // On this resource attach a GET method which pass reuest to our Lambda function
    helloResource.addMethod("GET", helloFromLambdaIntegration, {
      methodResponses: [{ statusCode: "200" }],
      authorizer,
    });
  }
}
