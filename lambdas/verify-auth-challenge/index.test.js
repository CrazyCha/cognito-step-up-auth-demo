// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

jest.mock('@aws-sdk/client-dynamodb');

const mockSend = jest.fn();
DynamoDBClient.prototype.send = mockSend;

const { handler } = require('./index');

function makeEvent(otpId, answer) {
  return {
    userName: 'testuser',
    request: {
      privateChallengeParameters: { otpId },
      challengeAnswer: answer,
    },
    response: {},
  };
}

function otpItem(otp, userId = 'testuser', expiresAt = Math.floor(Date.now() / 1000) + 300) {
  return {
    Item: {
      otp: { S: otp },
      userId: { S: userId },
      expiresAt: { N: expiresAt.toString() },
    },
  };
}

beforeEach(() => {
  mockSend.mockReset();
});

describe('VerifyAuthChallenge', () => {
  test('accepts correct OTP', async () => {
    mockSend
      .mockResolvedValueOnce(otpItem('123456'))
      .mockResolvedValueOnce({});

    const result = await handler(makeEvent('otp-1', '123456'));

    expect(result.response.answerCorrect).toBe(true);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  test('rejects incorrect OTP', async () => {
    mockSend.mockResolvedValueOnce(otpItem('123456'));

    const result = await handler(makeEvent('otp-1', '000000'));

    expect(result.response.answerCorrect).toBe(false);
  });

  test('rejects expired OTP', async () => {
    const expired = Math.floor(Date.now() / 1000) - 10;
    mockSend
      .mockResolvedValueOnce(otpItem('123456', 'testuser', expired))
      .mockResolvedValueOnce({});

    const result = await handler(makeEvent('otp-1', '123456'));

    expect(result.response.answerCorrect).toBe(false);
  });

  test('rejects when OTP not found', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    const result = await handler(makeEvent('otp-1', '123456'));

    expect(result.response.answerCorrect).toBe(false);
  });

  test('rejects when user does not match', async () => {
    mockSend.mockResolvedValueOnce(otpItem('123456', 'otheruser'));

    const result = await handler(makeEvent('otp-1', '123456'));

    expect(result.response.answerCorrect).toBe(false);
  });

  test('rejects when otpId is missing', async () => {
    const event = {
      userName: 'testuser',
      request: {
        privateChallengeParameters: {},
        challengeAnswer: '123456',
      },
      response: {},
    };

    const result = await handler(event);

    expect(result.response.answerCorrect).toBe(false);
  });
});
