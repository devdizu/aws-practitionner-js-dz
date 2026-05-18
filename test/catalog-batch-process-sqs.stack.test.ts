import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import * as sns from "aws-cdk-lib/aws-sns";
import { CatalogBatchProcessSqsStack } from "../lib/stacks/catalog-batch-process-sqs/catalog-batch-process-sqs.stack";

describe("CatalogBatchProcessSqsStack", () => {
  let app: cdk.App;
  let stack: CatalogBatchProcessSqsStack;
  let snsStack: cdk.Stack;
  let topic: sns.Topic;

  beforeEach(() => {
    app = new cdk.App();
    
    // Create SNS Topic in a separate stack
    snsStack = new cdk.Stack(app, "SnsStack");
    topic = new sns.Topic(snsStack, "TestTopic", {
      topicName: "test-topic",
    });

    // Create the stack under test
    stack = new CatalogBatchProcessSqsStack(app, "TestStack", {
      createProductTopic: topic,
    });
  });

  test("creates SQS Queue with correct name", () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::SQS::Queue", {
      QueueName: "catalogItemsQueue",
    });
  });

  test("creates Lambda Function with correct properties", () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "catalogBatchProcess",
      Runtime: "nodejs22.x",
      MemorySize: 1024,
      Timeout: 5,
      Handler: "handler.main",
    });
  });

  test("Lambda Function has SNS_TOPIC_ARN environment variable", () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: Match.objectLike({
        Variables: Match.objectLike({
          SNS_TOPIC_ARN: Match.objectLike({}),
        }),
      }),
    });
  });

  test("Lambda Function has SQS event source mapping", () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::Lambda::EventSourceMapping", {
      BatchSize: 5,
    });
  });

  test("Lambda Function has permission to publish to SNS Topic", () => {
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "sns:Publish",
            Effect: "Allow",
          }),
        ]),
      },
    });
  });

  test("exports catalogItemsQueue property", () => {
    expect(stack.catalogItemsQueue).toBeDefined();
    expect(stack.catalogItemsQueue).toHaveProperty("queueName");
  });

  test("requires createProductTopic in props", () => {
    expect(() => {
      new CatalogBatchProcessSqsStack(app, "InvalidStack", {
        // @ts-expect-error - testing missing required prop
        createProductTopic: undefined,
      });
    }).toThrow();
  });
});
