// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

/**
 * PreTokenGeneration — injects step-up context into the JWT.
 *
 * When the app passes clientMetadata.stepUp='true' during the CUSTOM_AUTH
 * challenge response, this trigger adds two claims to the ID token:
 *
 *   step_up       : "true"
 *   step_up_at    : Unix epoch (seconds) when step-up was completed
 *
 * Downstream services (booking API, payment API) can verify these claims
 * locally using JWT signature validation, without an additional Cognito API call.
 *
 * See DECISIONS.md ADR-006.
 */
exports.handler = async (event) => {
  const { clientMetadata } = event.request;

  console.log('PreTokenGeneration', JSON.stringify({
    triggerSource: event.triggerSource,
    userName: event.userName,
    hasStepUpMeta: clientMetadata?.stepUp === 'true',
  }));

  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {},
      claimsToSuppress: [],
    },
  };

  if (clientMetadata?.stepUp === 'true') {
    const stepUpAt = Math.floor(Date.now() / 1000).toString();
    event.response.claimsOverrideDetails.claimsToAddOrOverride = {
      step_up: 'true',
      step_up_at: stepUpAt,
      // Include the booking amount in the claim so downstream services can
      // re-validate that the step-up was for the specific amount being processed
      ...(clientMetadata.bookingAmount && {
        step_up_booking_amount: clientMetadata.bookingAmount,
      }),
    };
    console.log(`Injecting step_up claim (step_up_at=${stepUpAt})`);
  }

  return event;
};
