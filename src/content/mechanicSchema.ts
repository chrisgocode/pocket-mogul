import { z } from 'zod';

import { bakeryMechanicSchema } from './bakerySchema';
import { carWashMechanicSchema } from './carWashSchema';
import { coffeeKioskMechanicSchema } from './coffeeKioskSchema';
import { deliveryMechanicSchema } from './deliverySchema';
import { foodCartMechanicSchema } from './foodCartSchema';
import { gymMechanicSchema } from './gymSchema';
import { hotelMechanicSchema } from './hotelSchema';
import { laundromatMechanicSchema } from './laundromatSchema';
import { vendingMechanicSchema } from './vendingSchema';

export const mechanicSchema = z.discriminatedUnion('kind', [
  vendingMechanicSchema,
  carWashMechanicSchema,
  deliveryMechanicSchema,
  foodCartMechanicSchema,
  coffeeKioskMechanicSchema,
  laundromatMechanicSchema,
  bakeryMechanicSchema,
  gymMechanicSchema,
  hotelMechanicSchema,
]);
