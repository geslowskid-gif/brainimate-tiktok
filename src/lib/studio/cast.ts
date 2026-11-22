import { defaultCharacter, DEFAULT_COLORS, type CharacterOptions } from '$lib/character/model';

// the regular cast of the channel, drawn from the same options every time so a character looks exactly
// the same in every scene and every episode. where it stands and which way it looks change, never who it is
export type CastId = 'tom' | 'lina' | 'oldman' | 'explainer';

export function castOptions(id: CastId, width: number, height: number, x: number, facing: 1 | -1): CharacterOptions {
  const base = defaultCharacter(width, height);
  switch (id) {
    case 'tom':
      return { ...base, name: 'Tom', x, facing };
    case 'lina':
      return { ...base, name: 'Lina', x, facing, hair: 'long', seed: 11, colors: { ...DEFAULT_COLORS, hair: '#6b4a32', shirt: '#a8433a', pants: '#2b3348' } };
    case 'explainer':
      // a small figure in the corner of the picture: a clever looking explainer in a white lab coat
      return {
        ...base,
        name: 'Erklärer',
        x,
        facing,
        height: Math.round(height * 0.3),
        ground: Math.round(height * 0.955),
        hair: 'sidepart',
        seed: 31,
        glasses: 'square',
        outline: 5,
        colors: { ...DEFAULT_COLORS, skin: '#e2c4a6', hair: '#2d2a28', shirt: '#e9e6df', pants: '#3a4150', shoes: '#262a36' }
      };
    case 'oldman':
      return { ...base, name: 'Fahrgast', x, facing, hair: 'bald', seed: 23, glasses: 'round', colors: { ...DEFAULT_COLORS, skin: '#d9b99b', hair: '#b9b4ab', shirt: '#4f4436', pants: '#2f2b27', shoes: '#1f1c19' } };
  }
}
