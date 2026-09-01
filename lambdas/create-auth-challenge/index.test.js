// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { SESClient } = require('@aws-sdk/client-ses');

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/client-ses');

const mockDdbSend = jest.fn();
const mockSesSend = jest.fn();
DynamoDBClient.prototype.send = mockDdbSend;
SESClient.prototype.send = mockSesSend;

const { handler } = require('./index');

function makeEvent() {
  return {
    userName: 'testuser',
    request: {
      userAttributes: { email: 'test@example.com' },
    },
    response: {},
  };
}

beforeEach(() => {
  mockDdbSend.mockReset();
  mockSesSend.mockReset();
});

describe('CreateAuthChallenge', () => {
  test('stores OTP in DynamoDB and returns challenge parameters', async () => {
    mockDdbSend.mockResolvedValueOnce({});

    const result = await handler(makeEvent());

    expect(mockDdbSend).toHaveBeenCalledTimes(1);
    expect(result.response.publicChallengeParameters.email).toBe('t**t@example.com');
    expect(result.response.publicChallengeParameters.expiryMinutes).toBeDefined();
    expect(result.response.privateChallengeParameters.otpId).toBeDefined();
    expect(result.response.challengeMetadata).toMatch(/^OTP_CHALLENGE:/);
  });

  test('throws descriptive error when DynamoDB fails', async () => {
    mockDdbSend.mockRejectedValueOnce(new Error('ConditionalCheckFailedException'));

    await expect(handler(makeEvent())).rejects.toThrow('OTP generation failed');
  });

  test('masks email correctly', async () => {
    mockDdbSend.mockResolvedValueOnce({});

    const event = makeEvent();
    event.request.userAttributes.email = 'ab@example.com';
    const result = await handler(event);

    expect(result.response.publicChallengeParameters.email).toBe('a*@example.com');
  });
});
