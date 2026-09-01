#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { StepUpAuthStack } from '../lib/step-up-auth-stack';

const app = new cdk.App();
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

new StepUpAuthStack(app, 'StepUpAuthStack', {
  // Override defaults via context: cdk deploy -c bookingThreshold=3000
  bookingThreshold: app.node.tryGetContext('bookingThreshold')
    ? Number(app.node.tryGetContext('bookingThreshold'))
    : 5000,
  otpExpirySeconds: app.node.tryGetContext('otpExpirySeconds')
    ? Number(app.node.tryGetContext('otpExpirySeconds'))
    : 300,
  otpDeliveryMode: app.node.tryGetContext('otpDeliveryMode') ?? 'console',
  fromEmail: app.node.tryGetContext('fromEmail') ?? '',

  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'Cognito step-up auth reference implementation (CDE demo)',
});
