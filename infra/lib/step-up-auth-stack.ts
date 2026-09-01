// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface StepUpAuthStackProps extends cdk.StackProps {
  /** Booking amount (USD) above which step-up is triggered. Default: 5000 */
  bookingThreshold?: number;
  /** OTP validity in seconds. Default: 300 */
  otpExpirySeconds?: number;
  /** 'email' (SES) or 'console' (CloudWatch Logs — demo only). Default: 'console' */
  otpDeliveryMode?: 'email' | 'console';
  /** SES-verified sender address. Required when otpDeliveryMode='email' */
  fromEmail?: string;
}

export class StepUpAuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly otpTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StepUpAuthStackProps) {
    super(scope, id, props);

    const bookingThreshold = props?.bookingThreshold ?? 5000;
    const otpExpirySeconds = props?.otpExpirySeconds ?? 300;
    const otpDeliveryMode = props?.otpDeliveryMode ?? 'console';
    const fromEmail = props?.fromEmail ?? '';

    if (otpDeliveryMode === 'email' && !fromEmail) {
      console.warn(
        '[StepUpAuthStack] WARNING: otpDeliveryMode=email but fromEmail is empty. ' +
        'Pass -c fromEmail=no-reply@example.com or use -c otpDeliveryMode=console.'
      );
    }

    // ── DynamoDB: OTP storage ─────────────────────────────────────────────────
    this.otpTable = new dynamodb.Table(this, 'OtpTable', {
      tableName: `StepUpAuth-OtpStore-${this.stackName}`,
      partitionKey: { name: 'otpId', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'expiresAt',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const lambdaRoot = path.join(__dirname, '../../lambdas');

    // Lambda defaults shared across all four trigger functions.
    // @aws-sdk/* is included in the Node.js 20.x Lambda managed runtime,
    // so Code.fromAsset (directory zip) works without bundling.
    const lambdaDefaults: Omit<lambda.FunctionProps, 'code' | 'handler' | 'environment'> = {
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    };

    const mkCode = (dir: string) =>
      lambda.Code.fromAsset(path.join(lambdaRoot, dir));

    // ── Lambda: DefineAuthChallenge ───────────────────────────────────────────
    const defineAuthChallengeFn = new lambda.Function(this, 'DefineAuthChallenge', {
      ...lambdaDefaults,
      code: mkCode('define-auth-challenge'),
      handler: 'index.handler',
      functionName: `${this.stackName}-DefineAuthChallenge`,
      environment: {
        BOOKING_THRESHOLD: bookingThreshold.toString(),
        MAX_ATTEMPTS: '3',
      },
    });

    // ── Lambda: CreateAuthChallenge ───────────────────────────────────────────
    const createAuthChallengeFn = new lambda.Function(this, 'CreateAuthChallenge', {
      ...lambdaDefaults,
      code: mkCode('create-auth-challenge'),
      handler: 'index.handler',
      functionName: `${this.stackName}-CreateAuthChallenge`,
      environment: {
        OTP_TABLE_NAME: this.otpTable.tableName,
        OTP_EXPIRY_SECONDS: otpExpirySeconds.toString(),
        OTP_DELIVERY_MODE: otpDeliveryMode,
        FROM_EMAIL: fromEmail,
      },
    });

    this.otpTable.grantWriteData(createAuthChallengeFn);

    // SES wildcard resource: this demo runs in console delivery mode (no SES calls).
    // When otpDeliveryMode='email', the wildcard is acceptable for a prototype because
    // the verified identity ARN depends on the operator's SES setup and is not known at
    // synth time. Production deployments must scope this to a specific identity ARN.
    if (otpDeliveryMode === 'email') {
      createAuthChallengeFn.addToRolePolicy(
        new iam.PolicyStatement({
          sid: 'AllowSESSend',
          actions: ['ses:SendEmail', 'ses:SendRawEmail'],
          resources: ['*'],
        })
      );
    }

    // ── Lambda: VerifyAuthChallenge ───────────────────────────────────────────
    const verifyAuthChallengeFn = new lambda.Function(this, 'VerifyAuthChallenge', {
      ...lambdaDefaults,
      code: mkCode('verify-auth-challenge'),
      handler: 'index.handler',
      functionName: `${this.stackName}-VerifyAuthChallenge`,
      environment: {
        OTP_TABLE_NAME: this.otpTable.tableName,
      },
    });

    this.otpTable.grantReadData(verifyAuthChallengeFn);
    this.otpTable.grantWriteData(verifyAuthChallengeFn);

    // ── Lambda: PreTokenGeneration ────────────────────────────────────────────
    const preTokenGenerationFn = new lambda.Function(this, 'PreTokenGeneration', {
      ...lambdaDefaults,
      code: mkCode('pre-token-generation'),
      handler: 'index.handler',
      functionName: `${this.stackName}-PreTokenGeneration`,
    });

    // ── Cognito User Pool ─────────────────────────────────────────────────────
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `StepUpAuth-Demo-${this.stackName}`,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      lambdaTriggers: {
        defineAuthChallenge: defineAuthChallengeFn,
        createAuthChallenge: createAuthChallengeFn,
        preTokenGeneration: preTokenGenerationFn,
        // verifyAuthChallenge omitted here intentionally — added via addTrigger below
        // because CDK's lambdaTriggers property does not emit VerifyAuthChallengeResponse
        // in the CloudFormation LambdaConfig. See DECISIONS.md for details.
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // VerifyAuthChallengeResponse must be registered via addTrigger — CDK's lambdaTriggers
    // property silently omits it from the CloudFormation LambdaConfig output.
    this.userPool.addTrigger(
      cognito.UserPoolOperation.VERIFY_AUTH_CHALLENGE_RESPONSE,
      verifyAuthChallengeFn
    );

    // ── Cognito App Client ────────────────────────────────────────────────────
    this.userPoolClient = this.userPool.addClient('BookingAppClient', {
      userPoolClientName: 'booking-app-demo',
      authFlows: {
        userSrp: true,
        custom: true,
        // USER_PASSWORD_AUTH is enabled for demo convenience ONLY.
        // Must be disabled before production. See DECISIONS.md ADR-005.
        userPassword: true,
      },
      generateSecret: false,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // ── Stack Outputs ─────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${this.stackName}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID (no secret)',
      exportName: `${this.stackName}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'OtpTableName', {
      value: this.otpTable.tableName,
      description: 'DynamoDB table name for OTP storage',
    });

    new cdk.CfnOutput(this, 'AwsRegion', {
      value: this.region,
      description: 'AWS region',
    });

    new cdk.CfnOutput(this, 'BookingThreshold', {
      value: bookingThreshold.toString(),
      description: 'Booking amount (USD) threshold that triggers step-up',
    });
  }
}
