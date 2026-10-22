import streamDeck, {
  DialAction,
  DialDownEvent,
  DialRotateEvent,
  DidReceiveSettingsEvent,
  FeedbackPayload,
  SingletonAction,
  TouchTapEvent,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";
import type { JsonObject } from "@elgato/utils";
import { Channel } from "../types/channels";
import { ChannelVolume } from "../types/volume-classic";
import { isExpectedSonarError } from "../types/errors";
import { getChannelIcon, getNextChannel } from "../util/channel";
import { clamp } from "../util/util";
import { getErrorMessage, runAction } from "../util/action";
import { DEFAULT_DOUBLE_TAP_WAIT_MS, TapDetector, TapKind } from "../util/tap-detector";

const REFRESH_INTERVAL_MS = 1000;
const DEFAULT_STEP_SIZE = 5;

export type VolumeDialSettings = {
  selectedChannel: Channel;
  stepSize: number | string;
};

/** Reads the volume a dial points at from one fetch of Sonar's volume settings. */
export type VolumeLookup<T> = (settings: T) => ChannelVolume;

/**
 * Shared behaviour of the classic and streamer volume dials:
 * - one refresh timer for all dials of an action, stopped when none are visible;
 * - one Sonar request per refresh, however many dials are visible;
 * - settings kept from events, so the touch strip never shows a stale channel;
 * - fast rotation is added up and written one request at a time;
 * - "Sonar off" or the wrong mode is shown on the dial instead of throwing every second;
 * - an optional double tap on the touch strip; single taps only wait for a second tap when it is on.
 */
export abstract class VolumeDialBase<T extends VolumeDialSettings & JsonObject> extends SingletonAction<T> {
  protected abstract readonly label: string;
  /** Shown on the dial while Sonar is in the other mode. */
  protected abstract readonly wrongModeText: string;

  protected abstract withDefaults(settings: Partial<T>): T;
  protected abstract getTitle(settings: T): string;
  protected abstract isActiveMode(): Promise<boolean>;
  protected abstract loadVolumes(): Promise<VolumeLookup<T>>;
  protected abstract setVolume(settings: T, volume: number): Promise<unknown>;
  protected abstract setMute(settings: T, muted: boolean): Promise<unknown>;

  private readonly dials = new Map<string, { action: DialAction<T>; settings: T }>();
  private readonly pendingTicks = new Map<string, number>();
  private intervalId: NodeJS.Timeout | null = null;
  private refreshing = false;
  private readonly taps = new TapDetector((id, kind) => {
    const dial = this.dials.get(id);
    if (dial) void this.applyTouch(dial.action, dial.settings, kind);
  });

  override async onWillAppear(ev: WillAppearEvent<T>): Promise<void> {
    if (!ev.action.isDial()) return;

    const settings = this.withDefaults(ev.payload.settings);
    await ev.action.setSettings(settings);
    this.dials.set(ev.action.id, { action: ev.action, settings });
    this.intervalId ??= setInterval(() => void this.refreshAll(), REFRESH_INTERVAL_MS);
    void this.refreshAll();
  }

  override onWillDisappear(ev: WillDisappearEvent<T>): void {
    this.dials.delete(ev.action.id);
    this.pendingTicks.delete(ev.action.id);
    this.taps.cancel(ev.action.id);
    if (this.dials.size === 0 && this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  override onDidReceiveSettings(ev: DidReceiveSettingsEvent<T>): void {
    const dial = this.dials.get(ev.action.id);
    if (dial) dial.settings = this.withDefaults(ev.payload.settings);
    void this.refreshAll();
  }

  override async onDialRotate(ev: DialRotateEvent<T>): Promise<void> {
    const id = ev.action.id;
    const alreadyRunning = this.pendingTicks.has(id);
    this.pendingTicks.set(id, (this.pendingTicks.get(id) ?? 0) + ev.payload.ticks);
    if (alreadyRunning) return; // the loop below picks up the extra ticks

    await runAction(ev.action, `${this.label} rotate`, async () => {
      try {
        let ticks: number;
        while ((ticks = this.pendingTicks.get(id) ?? 0) !== 0) {
          this.pendingTicks.set(id, 0);
          const settings = this.getSettings(id, ev.payload.settings);
          const current = (await this.loadVolumes())(settings);
          const step = (Number(settings.stepSize) || DEFAULT_STEP_SIZE) / 100;
          const newVolume = clamp(current.volume + step * ticks, 0, 1);
          await this.setVolume(settings, newVolume);
          await ev.action.setFeedback(this.getFeedback(settings, { volume: newVolume, muted: current.muted }));
        }
      } finally {
        this.pendingTicks.delete(id);
      }
    });
  }

  override async onDialDown(ev: DialDownEvent<T>): Promise<void> {
    await runAction(ev.action, `${this.label} mute`, async () => {
      const settings = this.getSettings(ev.action.id, ev.payload.settings);
      const current = (await this.loadVolumes())(settings);
      await this.setMute(settings, !current.muted);
      await ev.action.setFeedback(this.getFeedback(settings, { ...current, muted: !current.muted }));
    });
  }

  override async onTouchTap(ev: TouchTapEvent<T>): Promise<void> {
    const id = ev.action.id;
    const settings = this.getSettings(id, ev.payload.settings);
    if (this.nextSettingsOnDoubleTouch(settings) === null) {
      // No double tap on this dial, so there is nothing to wait for.
      this.taps.cancel(id);
      await this.applyTouch(ev.action, settings, "single");
      return;
    }
    this.taps.tap(id, this.getDoubleTapWaitMs(settings));
  }

  /** What tapping the touch strip does; by default it moves to the next channel. */
  protected nextSettingsOnTouch(settings: T): T {
    return { ...settings, selectedChannel: getNextChannel(settings.selectedChannel) as Channel };
  }

  /** What a double tap does, or null when the dial has none (the default), so single taps act at once. */
  protected nextSettingsOnDoubleTouch(_settings: T): T | null {
    return null;
  }

  /** How long a tap waits for a second tap. */
  protected getDoubleTapWaitMs(_settings: T): number {
    return DEFAULT_DOUBLE_TAP_WAIT_MS;
  }

  private async applyTouch(action: DialAction<T>, current: T, kind: TapKind): Promise<void> {
    await runAction(action, `${this.label} touch`, async () => {
      const settings = kind === "double"
        ? (this.nextSettingsOnDoubleTouch(current) ?? current)
        : this.nextSettingsOnTouch(current);
      const dial = this.dials.get(action.id);
      if (dial) dial.settings = settings;
      await action.setSettings(settings);
      await this.refreshAll();
    });
  }

  private getSettings(id: string, fallback: T): T {
    return this.dials.get(id)?.settings ?? this.withDefaults(fallback);
  }

  private getFeedback(settings: T, volume: ChannelVolume): FeedbackPayload {
    return {
      indicator: Math.round(volume.volume * 100),
      value: getVolumeLabel(volume),
      title: this.getTitle(settings),
      icon: getChannelIcon(settings.selectedChannel),
    };
  }

  private async refreshAll(): Promise<void> {
    if (this.refreshing || this.dials.size === 0) return;
    this.refreshing = true;
    try {
      let status = "";
      let lookup: VolumeLookup<T> | undefined;
      try {
        if (await this.isActiveMode()) lookup = await this.loadVolumes();
        else status = this.wrongModeText;
      } catch (error) {
        status = isExpectedSonarError(error) ? "Sonar off" : "Error";
        if (!isExpectedSonarError(error)) {
          streamDeck.logger.error(`${this.label} refresh failed: ${getErrorMessage(error)}`);
        }
      }

      for (const [id, { action, settings }] of this.dials) {
        if (this.pendingTicks.has(id)) continue; // mid-rotation; the rotate handler owns the display
        const feedback: FeedbackPayload = lookup
          ? this.getFeedback(settings, lookup(settings))
          : { indicator: 0, value: status, title: this.getTitle(settings), icon: getChannelIcon(settings.selectedChannel) };
        await action.setFeedback(feedback).catch(() => {});
      }
    } finally {
      this.refreshing = false;
    }
  }
}

function getVolumeLabel(volume: ChannelVolume): string {
  if (volume.muted) return "Muted";
  return `${Math.round(volume.volume * 100)}%`;
}
