// This spec is local-only: it exercises detectDrift() against the cached
// Contract Model and the hand-curated LiveEvidence dataset, plus small
// synthetic fixtures for edge cases. It makes no network calls, unlike
// every API-resource spec in this suite.
import { detectDrift, detectDriftFromCachedSources } from '../../src/drift/detect-drift';
import { test, expect } from '../../src/fixtures/api.fixtures';
import type { ContractModel } from '../../src/contract/contract.schema';
import type { DriftFinding, LiveEvidence } from '../../src/drift/drift.schema';

function findingsFor(findings: DriftFinding[], operationId: string): DriftFinding[] {
  return findings.filter((f) => f.operationId === operationId);
}

test.describe('Drift Engine - detectDriftFromCachedSources', () => {
  test('produces exactly one finding per curated evidence entry against the real contract', () => {
    const findings = detectDriftFromCachedSources();
    // Every entry in LIVE_EVIDENCE is a real, already-proven fact, so each
    // one should surface exactly one finding — none should be silently
    // dropped, and none should be duplicated.
    expect(findings).toHaveLength(25);
  });

  test('breaks down findings by category as curated', () => {
    const findings = detectDriftFromCachedSources();
    const countOf = (category: DriftFinding['category']): number =>
      findings.filter((f) => f.category === category).length;

    expect(countOf('STATUS_CODE_MISMATCH')).toBe(10);
    expect(countOf('REQUIRED_FIELD_NOT_ENFORCED')).toBe(3);
    expect(countOf('ENUM_NOT_ENFORCED')).toBe(2);
    expect(countOf('SECURITY_NOT_ENFORCED')).toBe(9);
    expect(countOf('COLLECTION_FORMAT_MISMATCH')).toBe(1);
  });

  test('flags placeOrder and uploadFile as P0 status-code drift (both hide a real 500 defect)', () => {
    const findings = detectDriftFromCachedSources();

    const placeOrder = findingsFor(findings, 'placeOrder')[0];
    expect(placeOrder?.category).toBe('STATUS_CODE_MISMATCH');
    expect(placeOrder?.severity).toBe('P0');
    expect(placeOrder?.observed).toContain('500');

    const uploadFile = findingsFor(findings, 'uploadFile').find(
      (f) => f.category === 'STATUS_CODE_MISMATCH',
    );
    expect(uploadFile?.severity).toBe('P0');
  });

  test('flags every SECURITY_NOT_ENFORCED finding as P0', () => {
    const findings = detectDriftFromCachedSources().filter(
      (f) => f.category === 'SECURITY_NOT_ENFORCED',
    );
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.severity === 'P0')).toBe(true);
  });

  test('does NOT fabricate a COLLECTION_FORMAT_MISMATCH finding for findPetsByTags', () => {
    // findPetsByTags declares the same collectionFormat: multi as
    // findPetsByStatus, but Day 17 found no distinguishable live signal for
    // it — LIVE_EVIDENCE deliberately has no COLLECTION_FORMAT_MISMATCH
    // entry for it, and this test guards against that ever being "completed"
    // without new evidence. (It does have a legitimate, separately-evidenced
    // SECURITY_NOT_ENFORCED finding, from Day 17's discovery curl checks —
    // this test isn't about that category.)
    const findings = detectDriftFromCachedSources();
    const tagsCollectionFormatFindings = findingsFor(findings, 'findPetsByTags').filter(
      (f) => f.category === 'COLLECTION_FORMAT_MISMATCH',
    );
    expect(tagsCollectionFormatFindings).toEqual([]);
  });

  test('is deterministic across repeated calls', () => {
    const first = detectDriftFromCachedSources();
    const second = detectDriftFromCachedSources();
    expect(second).toEqual(first);
  });
});

test.describe('Drift Engine - detectDrift (pure function, synthetic fixtures)', () => {
  function minimalModel(overrides: Partial<ContractModel> = {}): ContractModel {
    return {
      operations: [],
      definitions: [],
      ...overrides,
    };
  }

  test('reports no finding when the evidence and contract already agree', () => {
    const model = minimalModel({
      operations: [
        {
          path: '/widget',
          method: 'get',
          operationId: 'getWidget',
          parameters: [],
          responses: [{ statusCode: '200' }],
          security: [],
          consumes: [],
          deprecated: false,
        },
      ],
    });
    const evidence: LiveEvidence = [
      {
        category: 'STATUS_CODE_MISMATCH',
        operationId: 'getWidget',
        observedStatusCodes: ['200'],
        evidence: 'synthetic',
      },
    ];

    expect(detectDrift(model, evidence)).toEqual([]);
  });

  test('does not fabricate REQUIRED_FIELD_NOT_ENFORCED when the contract never declared the field required', () => {
    const model = minimalModel({
      operations: [
        {
          path: '/widget',
          method: 'post',
          operationId: 'createWidget',
          parameters: [],
          requestBody: { required: true, schema: { kind: 'ref', name: 'Widget' } },
          responses: [{ statusCode: '200' }],
          security: [],
          consumes: [],
          deprecated: false,
        },
      ],
      definitions: [{ name: 'Widget', properties: [{ name: 'label', required: false }] }],
    });
    const evidence: LiveEvidence = [
      {
        category: 'REQUIRED_FIELD_NOT_ENFORCED',
        operationId: 'createWidget',
        fieldName: 'label',
        evidence: 'synthetic — label was never declared required in the first place',
      },
    ];

    // The contract never declared `label` required, so there is nothing to
    // report as drift — the evidence entry's premise doesn't hold here.
    expect(detectDrift(model, evidence)).toEqual([]);
  });

  test('throws when evidence references an operationId the contract model does not know about', () => {
    const model = minimalModel();
    const evidence: LiveEvidence = [
      {
        category: 'SECURITY_NOT_ENFORCED',
        operationId: 'doesNotExist',
        evidence: 'synthetic',
      },
    ];

    expect(() => detectDrift(model, evidence)).toThrow(/unknown operationId/);
  });
});
