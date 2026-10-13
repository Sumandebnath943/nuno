// Where everyone sits when a game starts. Humans are spread evenly around the
// table with bots between them, and everything else is left to chance, so
// friends don't all sit in a row and bots don't all play one after another.

function shuffle<T>(list: T[], rnd: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A new seating order. `isHuman[i]` says whether seat i is a person.
 * Returns the old seat indices in their new order (new seat k = old seat result[k]).
 * With at most half the table human, no two humans ever sit side by side.
 */
export function mixSeats(isHuman: boolean[], rnd: () => number = Math.random): number[] {
  const n = isHuman.length;
  const humans = shuffle(
    isHuman.flatMap((h, i) => (h ? [i] : [])),
    rnd,
  );
  const bots = shuffle(
    isHuman.flatMap((h, i) => (h ? [] : [i])),
    rnd,
  );
  if (humans.length <= 1 || bots.length === 0) return shuffle([...humans, ...bots], rnd);
  const out: number[] = new Array(n).fill(-1);
  // Evenly spaced spots from a random starting point. When humans outnumber
  // bots some must sit together; spacing keeps those runs as short as possible.
  const step = n / humans.length;
  const offset = rnd() * step;
  humans.forEach((h, k) => {
    let p = Math.floor(offset + k * step) % n;
    while (out[p] !== -1) p = (p + 1) % n;
    out[p] = h;
  });
  let b = 0;
  for (let i = 0; i < n; i++) if (out[i] === -1) out[i] = bots[b++];
  return out;
}
