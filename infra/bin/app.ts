#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StepUpAuthStack } from '../lib/step-up-auth-stack';

const app = new cdk.App();

new StepUpAuthStack(app, 'StepUpAuthStack', {
  // Override defaults via context: cdk deploy -c bookingThreshold=3000
  bookingThreshold: app.node.tryGetContext('bookingThreshold')
    ? Number(app.node.tryGetContext('bookingThreshold'))
    : 5000,
  otpExpirySeconds: app.node.tryGetContext('otpExpirySeconds')
    ? Number(app.node.tryGetContext('otpExpirySeconds'))
    : 300,
  otpDeliveryMode: app.node.tryGetContext('otpDeliveryMode') ?? 'email',
  fromEmail: app.node.tryGetContext('fromEmail') ?? '',

  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'Cognito step-up auth reference implementation (CDE demo)',
});
