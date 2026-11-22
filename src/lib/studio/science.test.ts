import { describe, expect, it } from 'vitest';
import type { Item } from '$lib/core/types';
import { ancestor, brainQuestion, catBristle, catHuman, airLayer, feelings, gooseArm, headphones, nervous, skinSection } from './science';

// the timeline matches the parts of two states by their ids: with an id twice, or an id that exists in one
// state only, parts jump or swap while one state turns into the next
function ids(items: Item[], out: string[] = []): string[] {
  for (const it of items) {
    out.push(it.id);
    if (it.type === 'group') ids(it.children, out);
  }
  return out;
}

const PICTURES: Record<string, (s: number) => Item[]> = {
  gooseArm: (s) => gooseArm(s),
  gooseFine: (s) => gooseArm(s, { n: 6, fine: true }),
  skinSection: (s) => skinSection(s),
  nervous: (s) => nervous(s * 1.6, s),
  ancestor: (s) => ancestor(s, s),
  catBristle: (s) => catBristle(s),
  catHuman: (s) => catHuman(s),
  airLayer: (s) => airLayer(s),
  music: (s) => feelings('music', s),
  film: (s) => feelings('film', s),
  moment: (s) => feelings('moment', s),
  brain: (s) => brainQuestion(s),
  headphones: () => headphones(500, 800, 100)
};

describe('the science pictures', () => {
  for (const [name, draw] of Object.entries(PICTURES)) {
    it(`${name}: every part has an id of its own and the same parts exist in every state`, () => {
      const a = ids(draw(0));
      const b = ids(draw(1));
      const dup = a.filter((id, i) => a.indexOf(id) !== i);
      expect(dup, `${name} has an id twice`).toEqual([]);
      expect(b, `${name} changes its parts between states`).toEqual(a);
    });
  }
});
