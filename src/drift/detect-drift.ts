import { loadContractModel } from '../contract/load-contract';
import type { ContractModel, ContractOperation } from '../contract/contract.schema';
import {
  DriftFindingSchema,
  type DriftFinding,
  type LiveEvidence,
  type LiveEvidenceEntry,
} from './drift.schema';
import { LIVE_EVIDENCE } from './live-evidence';

function findOperation(model: ContractModel, operationId: string): ContractOperation {
  const op = model.operations.find((o) => o.operationId === operationId);
  if (!op) {
    // A LiveEvidence entry pointing at an operation the current Contract
    // Model doesn't know about is an internal-consistency bug in the
    // evidence dataset (e.g. after a spec refresh) — fail loudly rather
    // than silently dropping a proven finding.
    throw new Error(`LiveEvidence references unknown operationId: ${operationId}`);
  }
  return op;
}

function buildFinding(
  op: ContractOperation,
  category: DriftFinding['category'],
  declared: string,
  observed: string,
  severity: DriftFinding['severity'],
  evidence: string,
  explanation: string,
): DriftFinding {
  return DriftFindingSchema.parse({
    operationId: op.operationId,
    path: op.path,
    method: op.method,
    category,
    declared,
    observed,
    severity,
    evidence,
    explanation,
  });
}

function detectStatusCodeMismatch(
  model: ContractModel,
  entry: Extract<LiveEvidenceEntry, { category: 'STATUS_CODE_MISMATCH' }>,
): DriftFinding[] {
  const op = findOperation(model, entry.operationId);
  const declaredCodes = op.responses.map((r) => r.statusCode);
  const declaredSet = new Set(declaredCodes);
  const undeclared = entry.observedStatusCodes.filter((code) => !declaredSet.has(code));

  if (undeclared.length === 0) {
    return [];
  }

  return [
    buildFinding(
      op,
      'STATUS_CODE_MISMATCH',
      `{${declaredCodes.join(', ')}}`,
      `{${entry.observedStatusCodes.join(', ')}}`,
      undeclared.includes('500') ? 'P0' : 'P1',
      entry.evidence,
      `Live-verified response status code(s) [${undeclared.join(', ')}] were observed but ` +
        `are not in the declared response set.`,
    ),
  ];
}

function definitionProperty(model: ContractModel, definitionName: string, fieldName: string) {
  const def = model.definitions.find((d) => d.name === definitionName);
  return def?.properties.find((p) => p.name === fieldName);
}

function detectRequiredFieldNotEnforced(
  model: ContractModel,
  entry: Extract<LiveEvidenceEntry, { category: 'REQUIRED_FIELD_NOT_ENFORCED' }>,
): DriftFinding[] {
  const op = findOperation(model, entry.operationId);

  // The field may be a request-body property (via a $ref definition) or a
  // path/query/header/formData parameter — check both, in that order.
  let declaredRequired: boolean | undefined;
  if (op.requestBody?.schema.kind === 'ref') {
    declaredRequired = definitionProperty(
      model,
      op.requestBody.schema.name,
      entry.fieldName,
    )?.required;
  }
  if (declaredRequired === undefined) {
    declaredRequired = op.parameters.find((p) => p.name === entry.fieldName)?.required;
  }

  if (!declaredRequired) {
    // The contract doesn't actually declare this field required — nothing
    // to report as drift (this would indicate a stale LiveEvidence entry).
    return [];
  }

  return [
    buildFinding(
      op,
      'REQUIRED_FIELD_NOT_ENFORCED',
      `${entry.fieldName}: required`,
      `${entry.fieldName}: request accepted when omitted`,
      'P1',
      entry.evidence,
      `The contract declares \`${entry.fieldName}\` required, but live verification proved ` +
        `the server accepts a request that omits it.`,
    ),
  ];
}

function detectEnumNotEnforced(
  model: ContractModel,
  entry: Extract<LiveEvidenceEntry, { category: 'ENUM_NOT_ENFORCED' }>,
): DriftFinding[] {
  const op = findOperation(model, entry.operationId);

  let declaredEnum: string[] | undefined;
  if (op.requestBody?.schema.kind === 'ref') {
    declaredEnum = definitionProperty(model, op.requestBody.schema.name, entry.fieldName)?.enum;
  }
  if (!declaredEnum) {
    declaredEnum = op.parameters.find((p) => p.name === entry.fieldName)?.enum;
  }

  if (!declaredEnum || declaredEnum.length === 0) {
    return [];
  }

  return [
    buildFinding(
      op,
      'ENUM_NOT_ENFORCED',
      `${entry.fieldName}: one of {${declaredEnum.join(', ')}}`,
      `${entry.fieldName}: arbitrary value accepted`,
      'P2',
      entry.evidence,
      `The contract declares \`${entry.fieldName}\` restricted to {${declaredEnum.join(', ')}}, ` +
        `but live verification proved the server accepts values outside that set.`,
    ),
  ];
}

function detectSecurityNotEnforced(
  model: ContractModel,
  entry: Extract<LiveEvidenceEntry, { category: 'SECURITY_NOT_ENFORCED' }>,
): DriftFinding[] {
  const op = findOperation(model, entry.operationId);

  if (op.security.length === 0) {
    // Nothing declared — nothing to report as drift.
    return [];
  }

  return [
    buildFinding(
      op,
      'SECURITY_NOT_ENFORCED',
      `security: {${op.security.join(', ')}}`,
      'request succeeds with no credentials',
      'P0',
      entry.evidence,
      `The contract declares the security scheme(s) {${op.security.join(', ')}}, but live ` +
        `verification proved requests succeed with no credentials at all.`,
    ),
  ];
}

function detectCollectionFormatMismatch(
  model: ContractModel,
  entry: Extract<LiveEvidenceEntry, { category: 'COLLECTION_FORMAT_MISMATCH' }>,
): DriftFinding[] {
  const op = findOperation(model, entry.operationId);
  const param = op.parameters.find((p) => p.name === entry.paramName);

  if (!param?.collectionFormat) {
    return [];
  }

  return [
    buildFinding(
      op,
      'COLLECTION_FORMAT_MISMATCH',
      `${entry.paramName}: collectionFormat=${param.collectionFormat}`,
      entry.observedBehavior,
      'P1',
      entry.evidence,
      `The contract declares \`${entry.paramName}\`'s collectionFormat as ` +
        `"${param.collectionFormat}", but live verification proved it doesn't behave that way.`,
    ),
  ];
}

/**
 * Pure, deterministic comparison of what the contract declares against what
 * has already been proven live. Makes no network calls and performs no live
 * verification of its own — it only cross-references two inputs it's given.
 */
export function detectDrift(model: ContractModel, evidence: LiveEvidence): DriftFinding[] {
  return evidence.flatMap((entry) => {
    switch (entry.category) {
      case 'STATUS_CODE_MISMATCH':
        return detectStatusCodeMismatch(model, entry);
      case 'REQUIRED_FIELD_NOT_ENFORCED':
        return detectRequiredFieldNotEnforced(model, entry);
      case 'ENUM_NOT_ENFORCED':
        return detectEnumNotEnforced(model, entry);
      case 'SECURITY_NOT_ENFORCED':
        return detectSecurityNotEnforced(model, entry);
      case 'COLLECTION_FORMAT_MISMATCH':
        return detectCollectionFormatMismatch(model, entry);
    }
  });
}

/** Convenience wrapper over the cached spec and the curated evidence dataset. */
export function detectDriftFromCachedSources(): DriftFinding[] {
  return detectDrift(loadContractModel(), LIVE_EVIDENCE);
}
