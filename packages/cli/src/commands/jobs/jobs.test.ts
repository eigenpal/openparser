import { describe, expect, it } from 'bun:test';
import { buildReviewCompleteBody, buildReviewReopenBody, buildReviewUpdateBody } from './index';

describe('buildReviewUpdateBody', () => {
  it('parses a full request body', () => {
    expect(
      buildReviewUpdateBody({
        body: JSON.stringify({
          expected_version: 2,
          confirmations: [{ path: '/invoice/total', value: 120 }],
        }),
      })
    ).toEqual({
      expected_version: 2,
      confirmations: [{ path: '/invoice/total', value: 120 }],
    });
  });

  it('builds from expected version and confirmation flags', () => {
    expect(
      buildReviewUpdateBody({
        expectedVersion: 1,
        confirmJson: JSON.stringify([{ path: 'vendor.name', value: 'Acme' }]),
      })
    ).toEqual({
      expected_version: 1,
      confirmations: [{ path: 'vendor.name', value: 'Acme' }],
    });
  });
});

describe('buildReviewCompleteBody', () => {
  it('parses a full request body', () => {
    expect(
      buildReviewCompleteBody({
        body: JSON.stringify({
          expected_version: 3,
          status: 'approved',
          note: 'Looks good',
        }),
      })
    ).toEqual({
      expected_version: 3,
      status: 'approved',
      note: 'Looks good',
    });
  });

  it('builds from expected version and status flags', () => {
    expect(
      buildReviewCompleteBody({
        expectedVersion: 0,
        status: 'rejected',
      })
    ).toEqual({
      expected_version: 0,
      status: 'rejected',
    });
  });
});

describe('buildReviewReopenBody', () => {
  it('parses a full request body', () => {
    expect(
      buildReviewReopenBody({
        body: JSON.stringify({
          expected_version: 3,
        }),
      })
    ).toEqual({
      expected_version: 3,
    });
  });

  it('builds from expected version flag', () => {
    expect(
      buildReviewReopenBody({
        expectedVersion: 0,
      })
    ).toEqual({
      expected_version: 0,
    });
  });
});
