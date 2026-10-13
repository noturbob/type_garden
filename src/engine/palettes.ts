import { Palette, BotanicalSpecies } from '../types';

export interface SpeciesConfig {
  id: BotanicalSpecies;
  label: string;
  sublabel: string;
  defaultPalette: number;
}

export const SPECIES_CONFIGS: SpeciesConfig[] = [
  {
    id: 'wild-rose',
    label: 'Wild Rose & Ivy',
    sublabel: 'Climbing English briar roses & winding stems',
    defaultPalette: 0,
  },
  {
    id: 'sakura',
    label: 'Kyoto Sakura',
    sublabel: 'Delicate notched cherry blossoms & drifting petals',
    defaultPalette: 2,
  },
  {
    id: 'bioluminescent',
    label: 'Neon Bioluminescence',
    sublabel: 'Glowing electric spores & cybernetic flora',
    defaultPalette: 4,
  },
  {
    id: 'golden-ginkgo',
    label: 'Imperial Ginkgo',
    sublabel: 'Art Nouveau golden fan leaves & jade twigs',
    defaultPalette: 7,
  },
  {
    id: 'emerald-lotus',
    label: 'Zen Lotus',
    sublabel: 'Water lily pads & layered silk petals',
    defaultPalette: 5,
  },
];

export const PALETTES: Palette[] = [
  {
    name: 'Rose Noir',
    bg: '#000000',
    flower: '#FF1400',
    stem: '#3257FF',
    line: '#FFB4A8',
    text: '#FFFFFF',
    vein: '#000000',
  },
  {
    name: 'Paper Vintage',
    bg: '#F4EFE6',
    flower: '#E63920',
    stem: '#1A2980',
    line: '#FDC4B6',
    text: '#121212',
    vein: '#F4EFE6',
  },
  {
    name: 'Kyoto Sakura',
    bg: '#0F0914',
    flower: '#FF8FB1',
    stem: '#3D2C4D',
    line: '#FFE5EC',
    text: '#FFFFFF',
    vein: '#0F0914',
  },
  {
    name: 'Matcha Blossom',
    bg: '#17231A',
    flower: '#FFB7C5',
    stem: '#5C9E69',
    line: '#FFFFFF',
    text: '#F5EFE6',
    vein: '#17231A',
  },
  {
    name: 'Cyberpunk Neon',
    bg: '#080514',
    flower: '#00F0FF',
    stem: '#BD00FF',
    line: '#FFFFFF',
    text: '#FFFFFF',
    vein: '#080514',
  },
  {
    name: 'Zen Lotus',
    bg: '#071618',
    flower: '#FF6B8B',
    stem: '#20B2AA',
    line: '#FFE4E1',
    text: '#F0FFFF',
    vein: '#071618',
  },
  {
    name: 'Midnight Garden',
    bg: '#0A122A',
    flower: '#FF5A4E',
    stem: '#9FB4FF',
    line: '#FFD6CF',
    text: '#FFFFFF',
    vein: '#0A122A',
  },
  {
    name: 'Imperial Gold & Jade',
    bg: '#0A1713',
    flower: '#FFD700',
    stem: '#1E6B52',
    line: '#FFF8DC',
    text: '#FDFBF7',
    vein: '#0A1713',
  },
  {
    name: 'Tomato & Silk',
    bg: '#E81C00',
    flower: '#FFF6E9',
    stem: '#0B0B0B',
    line: '#E81C00',
    text: '#000000',
    vein: '#E81C00',
  },
  {
    name: 'Editorial Monochrome',
    bg: '#0D0D0E',
    flower: '#EFEFEF',
    stem: '#666666',
    line: '#000000',
    text: '#FFFFFF',
    vein: '#0D0D0E',
  },
];
