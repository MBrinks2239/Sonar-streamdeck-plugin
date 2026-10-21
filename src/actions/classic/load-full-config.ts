import streamDeck, {
  action,
  KeyDownEvent,
  SendToPluginEvent,
  SingletonAction,
} from "@elgato/streamdeck";
import type {
	JsonValue
} from "@elgato/utils";
import SonarClassic from "../../managers/classic-sonar";
import { Channel } from "../../types/channels";
import { AudioDeviceType, parseSavedAudioDevice } from "../../types/audio-device";
import { getErrorMessage, listAudioDevicesForUi, runAction } from "../../util/action";

/** Each row of the property inspector: the settings prefix, its channel and its device setting. */
const configChannels: { prefix: "game" | "chat" | "media" | "aux" | "mic"; channel: Channel; deviceSetting: keyof LoadFullConfigSettings }[] = [
  { prefix: "game", channel: Channel.Game, deviceSetting: "gameChannelOutput" },
  { prefix: "chat", channel: Channel.Chat, deviceSetting: "chatChannelOutput" },
  { prefix: "media", channel: Channel.Media, deviceSetting: "mediaChannelOutput" },
  { prefix: "aux", channel: Channel.Aux, deviceSetting: "auxChannelOutput" },
  { prefix: "mic", channel: Channel.Mic, deviceSetting: "micChannelInput" },
];

@action({ UUID: "com.stellar.steelseries-sonar-controls.load-full-config" })
export class LoadFullConfig extends SingletonAction<LoadFullConfigSettings> {
  private readonly sonarInstance = new SonarClassic();

  override async onKeyDown(
    ev: KeyDownEvent<LoadFullConfigSettings>,
  ): Promise<void> {
    await runAction(ev.action, "Load full config", async () => {
      await this.sonarInstance.requireClassicMode();
      const settings = ev.payload.settings as Record<string, JsonValue | undefined>;
      const failures: string[] = [];

      // One request at a time, so the steps can't race each other. A failing step doesn't stop
      // the rest, and blank fields are skipped instead of being sent as NaN.
      for (const { prefix, channel, deviceSetting } of configChannels) {
        const attempt = async (what: string, step: () => Promise<unknown>) => {
          try {
            await step();
          } catch (error) {
            failures.push(`${prefix} ${what}: ${getErrorMessage(error)}`);
          }
        };

        const volume = settings[`${prefix}ChannelVolume`];
        if (volume !== undefined && volume !== null && volume !== "" && Number.isFinite(Number(volume))) {
          await attempt("volume", () => this.sonarInstance.setVolume(channel, Number(volume) / 100));
        }
        const device = parseSavedAudioDevice(settings[deviceSetting]);
        if (device) {
          await attempt("device", () => this.sonarInstance.switchDevice(channel, device));
        }
        await attempt("mute", () => this.sonarInstance.muteChannel(channel, settings[`${prefix}ChannelMute`] === true));
      }

      if (failures.length) throw new Error(failures.join("; "));
      await ev.action.showOk();
    });
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, LoadFullConfigSettings>,
  ): Promise<void> {
    const devices = await listAudioDevicesForUi(() => this.sonarInstance.getAudioDevices());
    const outputOptions = devices
      .filter((device) => device.type === AudioDeviceType.Output)
      .map((device) => ({ label: device.name, value: device.id }));

    const inputOptions = devices
      .filter((device) => device.type === AudioDeviceType.Input)
      .map((device) => ({ label: device.name, value: device.id }));

    streamDeck.ui.sendToPropertyInspector({
      event: "getOutputs",
      items: outputOptions,
    });

    streamDeck.ui.sendToPropertyInspector({
      event: "getInputs",
      items: inputOptions,
    });
  }
}

/**
 * Settings for {@link LoadFullConfig}.
 */
type LoadFullConfigSettings = {
  gameChannelVolume: number;
  gameChannelOutput: string;
  gameChannelMute: boolean;

  chatChannelVolume: number;
  chatChannelOutput: string;
  chatChannelMute: boolean;

  mediaChannelVolume: number;
  mediaChannelOutput: string;
  mediaChannelMute: boolean;

  auxChannelVolume: number;
  auxChannelOutput: string;
  auxChannelMute: boolean;

  micChannelVolume: number;
  micChannelInput: string;
  micChannelMute: boolean;
};
