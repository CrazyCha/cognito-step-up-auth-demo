import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export interface StepUpAuthStackProps extends cdk.StackProps {
  /** Booking amount (USD) above which step-up is triggered. Default: 5000 */
  bookingThreshold?: number;
  /** OTP validity in seconds. Default: 300 */
  otpExpirySeconds?: number;
  /** 'email' (SES) or 'console' (CloudWatch Logs — demo only). Default: 'email' */
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
    const otpDeliveryMode = props?.otpDeliveryMode ?? 'email';
    const fromEmail = props?.fromEmail ?? '';

    if (otpDeliveryMode === 'email' && !fromEmail) {
      throw new Error(
        'fromEmail is required when otpDeliveryMode is "email". ' +
        'Pass a SES-verified address via cdk deploy -c fromEmail=no-reply@example.com, ' +
        'or use -c otpDeliveryMode=console for demo without SES.'
      );
    }

    // ── DynamoDB: OTP storage ─────────────────────────────────────────────────
    this.otpTable = new dynamodb.Table(this, 'OtpTable', {
      tableName: `StepUpAuth-OtpStore-${this.stackName}`,
      partitionKey: { name: 'otpId', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'expiresAt',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // Non-production: allow table deletion with cdk destroy
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const lambdaDefaults = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      // Lambda functions in the Cognito auth critical path — keep cold starts fast
    };

    const lambdaRoot = path.join(__dirname, '../../lambdas');

    // ── Lambda: DefineAuthChallenge ───────────────────────────────────────────
    const defineAuthChallengeFn = new NodejsFunction(this, 'DefineAuthChallenge', {
      ...lambdaDefaults,
      entry: path.join(lambdaRoot, 'define-auth-challenge/index.js'),
      handler: 'handler',
      functionName: `${this.stackName}-DefineAuthChallenge`,
      environment: {
        BOOKING_THRESHOLD: bookingThreshold.toString(),
        MAX_ATTEMPTS: '3',
      },
    });

    // ── Lambda: CreateAuthChallenge ───────────────────────────────────────────
    const createAuthChallengeFn = new NodejsFunction(this, 'CreateAuthChallenge', {
      ...lambdaDefaults,
      entry: path.join(lambdaRoot, 'create-auth-challenge/index.js'),
      handler: 'handler',
      functionName: `${this.stackName}-CreateAuthChallenge`,
      environment: {
        OTP_TABLE_NAME: this.otpTable.tableName,
        OTP_EXPIRY_SECONDS: otpExpirySeconds.toString(),
        OTP_DELIVERY_MODE: otpDeliveryMode,
        FROM_EMAIL: fromEmail,
      },
    });

    // CreateAuthChallenge writes OTPs and reads nothing
    this.otpTable.grantWriteData(createAuthChallengeFn);

    // SES permission scoped to all identities — scope to verified domain in production
    if (otpDeliveryMode === 'email') {
      createAuthChallengeFn.addToRolePolicy(
        new iam.PolicyStatement({
          sid: 'AllowSESSend',
          actions: ['ses:SendEmail', 'ses:SendRawEmail'],
          // Production: replace '*' with specific SES identity ARN
          resources: ['*'],
        })
      );
    }

    // ── Lambda: VerifyAuthChallenge ───────────────────────────────────────────
    const verifyAuthChallengeFn = new NodejsFunction(this, 'VerifyAuthChallenge', {
      ...lambdaDefaults,
      entry: path.join(lambdaRoot, 'verify-auth-challenge/index.js'),
      handler: 'handler',
      functionName: `${this.stackName}-VerifyAuthChallenge`,
      environment: {
        OTP_TABLE_NAME: this.otpTable.tableName,
      },
    });

    // VerifyAuthChallenge reads OTPs and deletes them after consumption
    this.otpTable.grantReadData(verifyAuthChallengeFn);
    this.otpTable.grantWriteData(verifyAuthChallengeFn); // DeleteItem needs write

    // ── Lambda: PreTokenGeneration ────────────────────────────────────────────
    const preTokenGenerationFn = new NodejsFunction(this, 'PreTokenGeneration', {
      ...lambdaDefaults,
      entry: path.join(lambdaRoot, 'pre-token-generation/index.js'),
      handler: 'handler',
      functionName: `${this.stackName}-PreTokenGeneration`,
      // No environment variables needed — reads clientMetadata from Cognito event
    });

    // ── Cognito User Pool ─────────────────────────────────────────────────────
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `StepUpAuth-Demo-${this.stackName}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      lambdaTriggers: {
        defineAuthChallenge: defineAuthChallengeFn,
        createAuthChallenge: createAuthChallengeFn,
        verifyAuthChallenge: verifyAuthChallengeFn,
        preTokenGeneration: preTokenGenerationFn,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      // Non-production: allow user pool deletion with cdk destroy
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ── Cognito App Client ────────────────────────────────────────────────────
    this.userPoolClient = this.userPool.addClient('BookingAppClient', {
      userPoolClientName: 'booking-app-demo',
      authFlows: {
        userSrp: true,
        custom: true,
        // USER_PASSWORD_AUTH is enabled for demo convenience ONLY.
        // This MUST be disabled before production promotion.
        // See DECISIONS.md ADR-005 and SECURITY_COMPLIANCE.md Risk SC-R2.
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
