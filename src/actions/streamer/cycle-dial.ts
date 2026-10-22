import { action } from "@elgato/streamdeck";
import { Channel } from "../../types/channels";
import { CycleSlot, getCycleChannels, getNextCycleChannel, keepChannelInCycle, NO_CHANNEL } from "../../util/channel-cycle";
import { getDoubleTapWaitMs } from "../../util/tap-detector";
import { getOtherMix } from "./mix-toggle-dial";
import { StreamerVolumeDial, StreamerVolumeDialSettings } from "./volume-dial";

const SLOT_KEYS = ["cycleChannel1", "cycleChannel2", "cycleChannel3", "cycleChannel4", "cycleChannel5"] as const;
type SlotKey = (typeof SLOT_KEYS)[number];

/** The list a newly placed dial starts with. */
const DEFAULT_CYCLE: CycleSlot[] = [Channel.Game, Channel.Chat, Channel.Media, NO_CHANNEL, NO_CHANNEL];

/**
 * Streamer volume dial that also cycles through a list of channels:
 * push mutes, a tap flips between the Streaming and Monitoring mix, and a double tap moves to the
 * next channel in the list. With fewer than two channels in the list there is no double tap.
 */
@action({ UUID: "com.stellar.steelseries-sonar-controls.streamer.cycle-dial" })
export class StreamerCycleDial extends StreamerVolumeDial<StreamerCycleDialSettings> {
  protected override readonly label = "Streamer cycle-dial";

  protected override withDefaults(settings: Partial<StreamerCycleDialSettings>): StreamerCycleDialSettings {
    const isNew = SLOT_KEYS.every((key) => settings[key] === undefined);
    const slots = {} as Record<SlotKey, CycleSlot>;
    SLOT_KEYS.forEach((key, i) => (slots[key] = settings[key] ?? (isNew ? DEFAULT_CYCLE[i] : NO_CHANNEL)));

    const withDefaults = super.withDefaults({
      ...settings,
      ...slots,
      doubleTapWaitMs: getDoubleTapWaitMs(settings.doubleTapWaitMs),
    });
    // The dial never sits on a channel that isn't in the list.
    return { ...withDefaults, selectedChannel: keepChannelInCycle(getCycle(withDefaults), withDefaults.selectedChannel) };
  }

  protected override nextSettingsOnTouch(settings: StreamerCycleDialSettings): StreamerCycleDialSettings {
    return { ...settings, selectedSlider: getOtherMix(settings.selectedSlider) };
  }

  protected override nextSettingsOnDoubleTouch(settings: StreamerCycleDialSettings): StreamerCycleDialSettings | null {
    const cycle = getCycle(settings);
    if (cycle.length < 2) return null;
    return { ...settings, selectedChannel: getNextCycleChannel(cycle, settings.selectedChannel) };
  }

  protected override getDoubleTapWaitMs(settings: StreamerCycleDialSettings): number {
    return getDoubleTapWaitMs(settings.doubleTapWaitMs);
  }
}

function getCycle(settings: StreamerCycleDialSettings): Channel[] {
  return getCycleChannels(SLOT_KEYS.map((key) => settings[key]));
}

export type StreamerCycleDialSettings = StreamerVolumeDialSettings & Record<SlotKey, CycleSlot> & {
  doubleTapWaitMs: number | string;
};
