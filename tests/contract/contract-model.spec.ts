// This spec parses the cached local OpenAPI file only — it makes no network
// calls, unlike every other spec in this suite. It exists to prove the
// Contract Model loader correctly represents known, hand-verified facts
// about the spec, and to catch accidental drift if the cached spec is ever
// refreshed (see docs/AI-TEST-GENERATION.md §1 for that separate process).
import { loadContractModel } from '../../src/contract/load-contract';
import { test, expect } from '../../src/fixtures/api.fixtures';
import type { ContractOperation } from '../../src/contract/contract.schema';

function findOperation(operations: ContractOperation[], operationId: string): ContractOperation {
  const op = operations.find((o) => o.operationId === operationId);
  if (!op) {
    throw new Error(`operation not found: ${operationId}`);
  }
  return op;
}

test.describe('Contract Model - loadContractModel', () => {
  test('parses all 20 operations from the cached spec', () => {
    const model = loadContractModel();
    expect(model.operations).toHaveLength(20);
  });

  test('parses all 6 definitions from the cached spec', () => {
    const model = loadContractModel();
    const names = model.definitions.map((d) => d.name).sort();
    expect(names).toEqual(['ApiResponse', 'Category', 'Order', 'Pet', 'Tag', 'User']);
  });

  test("captures findByStatus's array query param, including its nested collectionFormat and enum", () => {
    const model = loadContractModel();
    const op = findOperation(model.operations, 'findPetsByStatus');

    const statusParam = op.parameters.find((p) => p.name === 'status');
    expect(statusParam).toMatchObject({
      in: 'query',
      required: true,
      type: 'array',
      collectionFormat: 'multi',
    });
    expect(statusParam?.enum).toEqual(['available', 'pending', 'sold']);
  });

  test('captures findByTags as deprecated', () => {
    const model = loadContractModel();
    const op = findOperation(model.operations, 'findPetsByTags');
    expect(op.deprecated).toBe(true);
  });

  test('captures declared security per operation, including operations with none declared', () => {
    const model = loadContractModel();

    expect(findOperation(model.operations, 'addPet').security).toEqual(['petstore_auth']);
    expect(findOperation(model.operations, 'getPetById').security).toEqual(['api_key']);
    // POST /store/order declares no security at all.
    expect(findOperation(model.operations, 'placeOrder').security).toEqual([]);
  });

  test("captures loginUser's declared response headers", () => {
    const model = loadContractModel();
    const op = findOperation(model.operations, 'loginUser');
    const success = op.responses.find((r) => r.statusCode === '200');

    expect(success?.headerNames).toEqual(['X-Expires-After', 'X-Rate-Limit']);
  });

  test('captures uploadFile as a multipart operation with no body param, only path/formData ones', () => {
    const model = loadContractModel();
    const op = findOperation(model.operations, 'uploadFile');

    expect(op.consumes).toEqual(['multipart/form-data']);
    expect(op.requestBody).toBeUndefined();
    expect(op.parameters.map((p) => p.name).sort()).toEqual([
      'additionalMetadata',
      'file',
      'petId',
    ]);
    expect(op.parameters.find((p) => p.name === 'petId')?.in).toBe('path');
  });

  test('captures request body schema refs, including array-of-ref bodies', () => {
    const model = loadContractModel();

    expect(findOperation(model.operations, 'placeOrder').requestBody).toEqual({
      required: true,
      schema: { kind: 'ref', name: 'Order' },
    });
    expect(findOperation(model.operations, 'createUsersWithArrayInput').requestBody).toEqual({
      required: true,
      schema: { kind: 'arrayOfRef', name: 'User' },
    });
  });

  test('Pet declares name and photoUrls as required; Order declares nothing required', () => {
    const model = loadContractModel();

    const pet = model.definitions.find((d) => d.name === 'Pet')!;
    const requiredPetProps = pet.properties.filter((p) => p.required).map((p) => p.name);
    expect(requiredPetProps.sort()).toEqual(['name', 'photoUrls']);

    const order = model.definitions.find((d) => d.name === 'Order')!;
    expect(order.properties.every((p) => !p.required)).toBe(true);
  });

  test('is deterministic across repeated loads', () => {
    const first = loadContractModel();
    const second = loadContractModel();
    expect(second).toEqual(first);
  });
});
