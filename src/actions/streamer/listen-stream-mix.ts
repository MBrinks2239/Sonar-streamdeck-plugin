import streamDeck, {
  action,
  KeyAction,
  KeyDownEvent,
  SingletonAction,
  WillAppearEvent,
  WillDisappearEvent,
} from "@elgato/streamdeck";
import SonarStreamer from "../../managers/streamer-sonar";
import { runAction } from "../../util/action";

const PERSONAL_MIX_STATE = 0;
const STREAM_MIX_STATE = 1;
const SYNC_INTERVAL_MS = 2000;
/** How long after a press the sync timer leaves the key alone while Sonar applies the change. */
const SETTLE_MS = 5000;

/**
 * Toggles whether the monitoring device (e.g. your headset) plays the Streaming mix or your
 * personal mix. The key follows Sonar, so changes made in the Sonar app show up too.
 */
@action({ UUID: "com.stellar.steelseries-sonar-controls.streamer.listen-stream-mix" })
export class StreamerListenStreamMix extends SingletonAction {
  private readonly sonarInstance = new SonarStreamer();
  private readonly keys = new Map<string, KeyAction>();
  private intervalId: NodeJS.Timeout | null = null;
  /** The value last set or read; presses toggle from this. */
  private known: boolean | undefined;
  private switching = false;
  private settleUntil = 0;

  override async onWillAppear(ev: WillAppearEvent): Promise<void> {
    if (!ev.action.isKey()) return;
    this.keys.set(ev.action.id, ev.action);
    this.intervalId ??= setInterval(() => void this.sync(), SYNC_INTERVAL_MS);
    await this.sync();
  }

  override onWillDisappear(ev: WillDisappearEvent): void {
    this.keys.delete(ev.action.id);
    if (this.keys.size === 0 && this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  override async onKeyDown(ev: KeyDownEvent): Promise<void> {
    // Sonar reroutes audio devices for this change and keeps reporting the old value for a
    // moment. Reading it back on every press made quick presses cancel out, so presses during a
    // switch are ignored and the toggle starts from the value we last set.
    if (this.switching) return;
    this.switching = true;
    try {
      await runAction(ev.action, "Streamer listen-stream-mix", async () => {
        await this.sonarInstance.requireStreamerMode();
        const current = this.known ?? (await this.sonarInstance.getStreamMonitoring());
        const enabled = !current;
        this.settleUntil = Date.now() + SETTLE_MS;
        await this.sonarInstance.setStreamMonitoring(enabled);
        this.known = enabled;
        await this.showState(enabled);
        streamDeck.logger.info(`Listen to stream mix: ${current} -> ${enabled}`);
      });
    } finally {
      this.switching = false;
    }
  }

  private async sync(): Promise<void> {
    if (this.switching || Date.now() < this.settleUntil) return;
    try {
      this.known = await this.sonarInstance.getStreamMonitoring();
      await this.showState(this.known);
    } catch {
      // Sonar is not available; read the value again on the next press.
      this.known = undefined;
    }
  }

  private async showState(enabled: boolean): Promise<void> {
    for (const key of this.keys.values()) {
      await key.setState(enabled ? STREAM_MIX_STATE : PERSONAL_MIX_STATE).catch(() => {});
    }
  }
}
