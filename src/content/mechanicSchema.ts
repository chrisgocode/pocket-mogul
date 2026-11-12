import { z } from 'zod';

import { carWashMechanicSchema } from './carWashSchema';
import { coffeeKioskMechanicSchema } from './coffeeKioskSchema';
import { deliveryMechanicSchema } from './deliverySchema';
import { foodCartMechanicSchema } from './foodCartSchema';
import { vendingMechanicSchema } from './vendingSchema';

export const mechanicSchema = z.discriminatedUnion('kind', [
  vendingMechanicSchema,
  carWashMechanicSchema,
  deliveryMechanicSchema,
  foodCartMechanicSchema,
  coffeeKioskMechanicSchema,
]);
