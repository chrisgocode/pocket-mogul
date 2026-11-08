import { deliveryBusiness, deliveryFlagship } from '@/domain/testDelivery';
import { businessRules, vendingDefinition } from '@/domain/testRules';

import { flagshipUnlockAt, unitsParkedAt } from './flagshipUnlocks';

const pricing = { definition: deliveryFlagship, rules: businessRules };

describe('what a stage unlocks for a flagship (BUS15)', () => {
  it('names the mechanic at its unlock stage and the signature upgrade at Global', () => {
    const stages = [2, 3, 5].map((stage) => flagshipUnlockAt(deliveryFlagship.mechanic, stage));
    expect(stages).toEqual(['mechanic', 'none', 'signature']);
  });

  it('unlocks nothing for a business on the shared core', () => {
    expect(flagshipUnlockAt({ kind: 'shared_core' }, 2)).toBe('none');
    expect(flagshipUnlockAt(vendingDefinition.mechanic, 2)).toBe('none');
  });

  it('counts the vans that stop at Local for want of drivers', () => {
    const noDrivers = { staff: { operations: 0, sales: 0, manager: 0 }, stage: 1, units: 3 };
    expect(unitsParkedAt(deliveryBusiness({}, noDrivers), { pricing, stage: 2 })).toBe(3);
    const oneDriver = { ...noDrivers, staff: { operations: 1, sales: 0, manager: 0 } };
    expect(unitsParkedAt(deliveryBusiness({}, oneDriver), { pricing, stage: 2 })).toBe(1);
    expect(unitsParkedAt(deliveryBusiness({}, noDrivers), { pricing, stage: 3 })).toBe(0);
  });
});
