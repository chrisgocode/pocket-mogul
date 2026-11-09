const ink = '#162B2B';
const mint = '#76C8B5';
const mintShade = '#284D48';
const mintLight = '#A2D8C8';
const cream = '#E9D5B1';
const amber = '#EABB72';
const clay = '#CE9972';
const clayShade = '#8E654F';
const slate = '#637F91';
const lavender = '#B6A5D6';

type ArtLayer = { d: string; fill: string };

export const businessDrawings: Readonly<Record<string, readonly ArtLayer[]>> = {
  vending: [
    { d: 'M25 16L70 11L81 20V84L70 91L25 86Z', fill: mintShade },
    { d: 'M25 16L70 11V91L25 86Z', fill: mint },
    { d: 'M30 22L59 19V61L30 62Z', fill: ink },
    { d: 'M32 24L57 22V28L32 30Z', fill: mintShade },
    { d: 'M43 22H46V61H43ZM30 41L59 39V42L30 44Z', fill: slate },
    { d: 'M34 33H40V38H34ZM48 31H54V36H48ZM34 49H40V56H34ZM48 47H54V54H48Z', fill: amber },
    { d: 'M62 30H67V43H62ZM34 73H58V78H34Z', fill: mintShade },
    { d: 'M29 86H35V94H29ZM62 89H68V96H62Z', fill: mintShade },
  ],
  food_cart: [
    { d: 'M17 47L72 43L86 50V79L72 87L17 80Z', fill: clay },
    { d: 'M72 43L86 50V79L72 87Z', fill: clayShade },
    { d: 'M17 50L72 47V81L17 77Z', fill: cream },
    { d: 'M13 47L22 23L70 18L80 42L72 48Z', fill: mint },
    {
      d: 'M22 23L31 22L26 46L15 47ZM45 20L54 19L58 44L46 45ZM69 18L78 40L68 43L61 19Z',
      fill: cream,
    },
    { d: 'M13 47L72 42L85 48L24 54Z', fill: mintLight },
    { d: 'M31 59H54V70H31Z', fill: mintShade },
    {
      d: 'M22 84A7 7 0 1 0 36 84A7 7 0 1 0 22 84M60 88A7 7 0 1 0 74 88A7 7 0 1 0 60 88',
      fill: ink,
    },
    {
      d: 'M26 84A3 3 0 1 0 32 84A3 3 0 1 0 26 84M64 88A3 3 0 1 0 70 88A3 3 0 1 0 64 88',
      fill: slate,
    },
  ],
  coffee_kiosk: [
    { d: 'M19 40L68 35L82 43V87L68 94L19 87Z', fill: clay },
    { d: 'M68 35L82 43V87L68 94Z', fill: clayShade },
    { d: 'M12 39L24 20L67 15L88 37L72 45Z', fill: mint },
    { d: 'M67 15L88 37L72 45L56 22Z', fill: mintShade },
    { d: 'M26 48L63 44V70L26 73Z', fill: ink },
    { d: 'M37 50H50V63H37ZM50 52H56V60H50V57H53V55H50Z', fill: cream },
    { d: 'M15 73L70 68L84 75L28 81Z', fill: mintLight },
    { d: 'M28 84H58V87H28Z', fill: clayShade },
  ],
  laundromat: [
    { d: 'M15 22L75 16L87 24V85L75 92L15 85Z', fill: slate },
    { d: 'M75 16L87 24V85L75 92Z', fill: mintShade },
    { d: 'M15 22L75 16V86L15 80Z', fill: mintLight },
    { d: 'M21 29L68 25V37L21 40Z', fill: mintShade },
    { d: 'M26 33H37V36H26ZM56 29H63V33H56Z', fill: cream },
    { d: 'M22 60A21 21 0 1 0 64 60A21 21 0 1 0 22 60', fill: cream },
    { d: 'M29 60A14 14 0 1 0 57 60A14 14 0 1 0 29 60', fill: ink },
    { d: 'M30 60Q43 51 56 60Q50 77 38 72Q32 69 30 60Z', fill: slate },
  ],
  car_wash: [
    { d: 'M11 85V24L70 17L88 27V85H75V36L24 42V85Z', fill: mintShade },
    { d: 'M11 24L70 17V34L11 41Z', fill: mint },
    { d: 'M11 41H24V85H11ZM61 35H74V85H61Z', fill: mintLight },
    { d: 'M26 44H32V70H26ZM52 40H58V68H52Z', fill: slate },
    { d: 'M25 70L32 55H55L65 70V86H25Z', fill: clay },
    { d: 'M34 59H53L59 69H29Z', fill: ink },
    { d: 'M29 76H36V80H29ZM54 76H61V80H54Z', fill: cream },
    { d: 'M28 86H36V92H28ZM55 86H63V92H55Z', fill: ink },
  ],
  bakery: [
    { d: 'M16 46L72 40L85 48V85L72 92L16 85Z', fill: clay },
    { d: 'M72 40L85 48V85L72 92Z', fill: clayShade },
    { d: 'M10 45L23 24L69 19L86 40L73 48Z', fill: lavender },
    { d: 'M23 24L32 23L26 44L15 45ZM47 21L56 20L61 43L49 45Z', fill: cream },
    { d: 'M23 51L65 47V78L23 80Z', fill: ink },
    { d: 'M29 70Q25 58 35 57Q43 57 40 70ZM45 69Q41 55 52 54Q63 54 59 68Z', fill: amber },
    { d: 'M32 61H38V64H32ZM48 59H56V62H48Z', fill: clayShade },
    { d: 'M19 78L71 74V80L19 84Z', fill: cream },
  ],
  delivery: [
    { d: 'M9 35L57 29L70 37V78L57 85L9 78Z', fill: mint },
    { d: 'M57 29L70 37V78L57 85Z', fill: mintShade },
    { d: 'M57 45L77 43L91 61V79L61 84Z', fill: cream },
    { d: 'M64 49L76 48L84 60L64 62Z', fill: ink },
    { d: 'M20 49L43 46V66L20 69Z', fill: amber },
    { d: 'M29 48L34 47V56L29 57Z', fill: clayShade },
    {
      d: 'M16 80A9 9 0 1 0 34 80A9 9 0 1 0 16 80M67 83A9 9 0 1 0 85 83A9 9 0 1 0 67 83',
      fill: ink,
    },
    {
      d: 'M21 80A4 4 0 1 0 29 80A4 4 0 1 0 21 80M72 83A4 4 0 1 0 80 83A4 4 0 1 0 72 83',
      fill: slate,
    },
  ],
  gym_chain: [
    { d: 'M17 78L72 72L85 80L30 88Z', fill: mintShade },
    { d: 'M25 49L32 45L67 66L60 71Z', fill: slate },
    { d: 'M17 35L28 29L39 36V66L28 73L17 66Z', fill: lavender },
    { d: 'M28 29L39 36V66L28 73Z', fill: slate },
    { d: 'M10 42L17 38V62L10 58Z', fill: cream },
    { d: 'M60 54L72 48L83 55V84L72 91L60 84Z', fill: lavender },
    { d: 'M72 48L83 55V84L72 91Z', fill: slate },
    { d: 'M83 60L90 64V79L83 83Z', fill: cream },
  ],
  hotel_group: [
    { d: 'M22 20L65 12L81 23V88L65 96L22 87Z', fill: clayShade },
    { d: 'M22 20L65 12V96L22 87Z', fill: cream },
    {
      d: 'M28 27L38 25V36L28 38ZM47 23L57 21V32L47 34ZM28 45L38 43V54L28 56ZM47 41L57 39V50L47 52Z',
      fill: slate,
    },
    { d: 'M69 28L76 32V43L69 39ZM69 48L76 52V63L69 59Z', fill: ink },
    { d: 'M37 69L53 67V93L37 90Z', fill: mintShade },
    { d: 'M17 66L59 60L70 67L28 73Z', fill: mint },
    { d: 'M29 11L59 6V17L29 22Z', fill: clay },
  ],
  manufacturer: [
    { d: 'M65 17L77 15L81 63L67 65Z', fill: clayShade },
    { d: 'M15 55L33 41V54L52 39V52L72 38L85 47V85L72 93L15 85Z', fill: mintShade },
    { d: 'M15 55L33 41V54L52 39V52L72 38V93L15 85Z', fill: slate },
    { d: 'M22 62H33V72H22ZM41 59H52V69H41ZM59 57H66V67H59Z', fill: cream },
    { d: 'M37 77H53V90L37 88Z', fill: ink },
    { d: 'M63 16Q56 8 63 5Q68 2 73 7L80 4L87 10L77 15Z', fill: cream },
  ],
  airline: [
    {
      d: 'M12 68L39 50L37 20L45 16L55 40L79 24Q87 20 90 25Q93 30 86 36L61 56L75 79L68 85L45 67L28 79L20 91L14 92L17 75Z',
      fill: cream,
    },
    { d: 'M12 68L45 67L68 85L75 79L61 56L86 36Q91 32 90 27L54 51L17 75Z', fill: slate },
    { d: 'M37 20L45 16L55 40L48 45ZM20 80L28 79L20 91L14 92Z', fill: mint },
    { d: 'M76 28L81 25L86 30L81 34Z', fill: ink },
  ],
  space_launch: [
    { d: 'M27 73L20 92L40 83ZM64 71L81 88L75 65Z', fill: mintShade },
    { d: 'M37 72L33 86L43 96L53 83Z', fill: amber },
    { d: 'M31 70Q27 38 61 10Q84 43 67 73L51 85Z', fill: cream },
    { d: 'M61 10Q84 43 67 73L51 85L46 78Q67 43 61 10Z', fill: slate },
    { d: 'M61 10Q48 20 42 31L70 33Q68 19 61 10Z', fill: clay },
    { d: 'M41 49A11 11 0 1 0 63 49A11 11 0 1 0 41 49', fill: mintShade },
    { d: 'M46 49A6 6 0 1 0 58 49A6 6 0 1 0 46 49', fill: mintLight },
    { d: 'M46 65L55 68L49 87L41 83Z', fill: mint },
  ],
};
