import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

const BATCH_SIZE = 5;

interface CatalogBatchProcessSqsStackProps extends cdk.StackProps {
  createProductTopic: sns.Topic;
}

export class CatalogBatchProcessSqsStack extends cdk.Stack {
  public readonly catalogItemsQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: CatalogBatchProcessSqsStackProps) {
    super(scope, id, props);

    const lambdaFunction = new lambda.Function(this, "catalogBatchProcess", {
      functionName: "catalogBatchProcess",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handler.main",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
      environment: {
        SNS_TOPIC_ARN: props.createProductTopic.topicArn,
      },
    });

    props.createProductTopic.grantPublish(lambdaFunction);

    this.catalogItemsQueue = new sqs.Queue(this, "catalogItemsQueue", {
      queueName: "catalogItemsQueue",
    });

    lambdaFunction.addEventSource(
      new SqsEventSource(this.catalogItemsQueue, {
        batchSize: BATCH_SIZE,
      })
    );
  }
}