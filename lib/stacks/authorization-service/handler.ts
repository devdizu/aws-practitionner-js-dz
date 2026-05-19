// Filename: basic-authorizer-stack/handler.ts
import type {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
} from "aws-lambda";

function buildPolicy(
  principalId: string,
  effect: "Allow" | "Deny",
  resource: string,
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}

function getBasicCredentials(authorizationToken?: string): { username: string; password: string } {
  if (!authorizationToken || !authorizationToken.startsWith("Basic ")) {
    throw new Error("Unauthorized");
  }

  const encodedCredentials = authorizationToken.slice(6).trim();
  if (!encodedCredentials) {
    throw new Error("Unauthorized");
  }

  const decodedCredentials = Buffer.from(encodedCredentials, "base64").toString("utf8");
  const separatorIndex = decodedCredentials.indexOf(":");

  if (separatorIndex < 1) {
    throw new Error("Unauthorized");
  }

  return {
    username: decodedCredentials.slice(0, separatorIndex),
    password: decodedCredentials.slice(separatorIndex + 1),
  };
}

export async function main(event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> {
  const { username, password } = getBasicCredentials(event.authorizationToken);
  const expectedPassword = process.env[username];

  if (!expectedPassword || expectedPassword !== password) {
    throw new Error("Unauthorized");
  }

  return buildPolicy(username, "Allow", event.methodArn);
}