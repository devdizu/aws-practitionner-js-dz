import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { Construct } from "constructs";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const importServiceBucket = new s3.Bucket(this, "ImportServiceBucket", {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      cors: [
        {
          allowedOrigins: ["http://localhost:3000", "https://d26p6ckbxp00ir.cloudfront.net"],
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedHeaders: ["*"],
          exposedHeaders: ["ETag"],
          maxAge: 3000,
        },
      ],
    });

    new s3deploy.BucketDeployment(this, "SeedUploadedFolder", {
      destinationBucket: importServiceBucket,
      sources: [s3deploy.Source.data("uploaded/.keep", ""), s3deploy.Source.data("parsed/.keep", "")],
      prune: false,
    });

    const importProductsFileLambda = new NodejsFunction(this, "importProductsFile", {
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      entry: path.join(__dirname, "handler.ts"),
      handler: "create",
      environment: {
        IMPORT_SERVICE_BUCKET: importServiceBucket.bucketName,
      },
    });

    const importFileParserLambda = new NodejsFunction(this, "importFileParser", {
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      entry: path.join(__dirname, "handler.ts"),
      handler: "parse",
      environment: {
        IMPORT_SERVICE_BUCKET: importServiceBucket.bucketName,
      },
    });

    // Grant lambda permission to upload files to S3 bucket
    importProductsFileLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject", "s3:PutObjectAcl"],
        resources: [`${importServiceBucket.bucketArn}/*`],
      }),
    );

    importProductsFileLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:ListBucket"],
        resources: [importServiceBucket.bucketArn],
      }),
    );

    // Grant lambda permission to read files from S3 bucket
    importFileParserLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        resources: [`${importServiceBucket.bucketArn}/*`],
      }),
    );

    // Add S3 event notification trigger to parse imported files (s3:ObjectCreated:*)
    importServiceBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT,
      new s3n.LambdaDestination(importFileParserLambda),
      {
        prefix: "uploaded/",
        suffix: ".csv",
      },
    );

    importServiceBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_POST,
      new s3n.LambdaDestination(importFileParserLambda),
      {
        prefix: "uploaded/",
        suffix: ".csv",
      },
    );

    importServiceBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_COPY,
      new s3n.LambdaDestination(importFileParserLambda),
      {
        prefix: "uploaded/",
        suffix: ".csv",
      },
    );

    importServiceBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_COMPLETE_MULTIPART_UPLOAD,
      new s3n.LambdaDestination(importFileParserLambda),
      {
        prefix: "uploaded/",
        suffix: ".csv",
      },
    );

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

    const postLambdaIntegration = new apigateway.LambdaIntegration(
      importProductsFileLambda,
      {
        requestTemplates: {
          "application/json": JSON.stringify({
            httpMethod: "$context.httpMethod",
            filename: "$input.params('filename')",
          }),
        },
        integrationResponses: [corsIntegrationResponse],
        proxy: false,
      },
    );

    const api = new apigateway.RestApi(this, "import-products-api", {
      restApiName: "Import Products API",
      description: "This API serves the Lambda functions for importing products.",
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.NONE,
        apiKeyRequired: false,
      },
      deployOptions: {
        stageName: "dev",
      },
    });

    const preflightOptions: apigateway.CorsOptions = {
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: ["GET", "POST"],
      allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
    };

    const importResource = api.root.addResource("import");
    const fileNameResource = importResource.addResource("{filename}");
    fileNameResource.addMethod("GET", postLambdaIntegration, {
      requestParameters: {
        "method.request.path.filename": true,
      },
      methodResponses: [corsMethodResponse],
    });
    
    fileNameResource.addCorsPreflight(preflightOptions);
  }
}
