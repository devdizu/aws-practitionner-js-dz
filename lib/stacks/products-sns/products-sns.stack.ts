// Filename: product-sns-stack.ts
import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { SnsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";

const SAMPLE_EMAIL = "Diego_Zuniga@epam.com";
const PREMIUM_EMAIL = "pikemi4365@getasail.com";

export class ProductSnsStack extends cdk.Stack {
  public readonly createProductTopic: sns.Topic;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.createProductTopic = new sns.Topic(this, "create-product-topic", {
      topicName: "create-product-topic",
    });

    const lambdaFunction = new lambda.Function(this, "sns-lambda", {
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "handler.main",
      code: lambda.Code.fromAsset(path.join(__dirname, "./")),
    });

    lambdaFunction.addEventSource(new SnsEventSource(this.createProductTopic));

    // Subscription for all products
    this.createProductTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(SAMPLE_EMAIL)
    );

    // Subscription for premium products (price >= 100) filtered by attribute
    this.createProductTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(PREMIUM_EMAIL, {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            greaterThanOrEqualTo: 100,
          }),
        },
      })
    );
  }
}