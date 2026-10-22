import { Channel } from "../types/channels";

/** Value of a cycle slot that is not used. */
export const NO_CHANNEL = "none";
export type CycleSlot = Channel | typeof NO_CHANNEL;

const CHANNELS = new Set<string>(Object.values(Channel));

/** The channels a dial cycles through: the set slots in order, with "None" and repeats left out. */
export function getCycleChannels(slots: readonly (string | undefined)[]): Channel[] {
  const cycle: Channel[] = [];
  for (const slot of slots) {
    if (slot && CHANNELS.has(slot) && !cycle.includes(slot as Channel)) cycle.push(slot as Channel);
  }
  return cycle;
}

/** The channel after `current` in the cycle, wrapping round. Starts at the first one if `current` is not in it. */
export function getNextCycleChannel(cycle: readonly Channel[], current: Channel): Channel {
  if (cycle.length === 0) return current;
  const index = cycle.indexOf(current);
  return cycle[(index + 1) % cycle.length];
}

/** Keeps `current` if it is in the cycle, otherwise moves to the first channel. An empty cycle changes nothing. */
export function keepChannelInCycle(cycle: readonly Channel[], current: Channel): Channel {
  if (cycle.length === 0 || cycle.includes(current)) return current;
  return cycle[0];
}
