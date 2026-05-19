// Filename: basic-authorizer-stack.ts
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as dotenv from "dotenv";
import { Construct } from "constructs";

dotenv.config();
  
export class AuthorizerStack extends cdk.Stack {
  public readonly basicAuthorizerLambdaFunction: lambda.Function;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const diegoPassword = process.env.Diego;
    if (!diegoPassword) {
      throw new Error("Missing Diego in .env for basic authorizer");
    }

    this.basicAuthorizerLambdaFunction = new lambda.Function(
      this,
      "lambda-function",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(5),
        handler: "handler.main",
        code: lambda.Code.fromAsset(path.join(__dirname, "./")),
        environment: {
          Diego: diegoPassword,
        },
      },
    );
  }
}
