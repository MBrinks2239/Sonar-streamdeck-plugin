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
import { listAudioDevicesForUi, runAction } from "../../util/action";

/** The legacy UI uses its own channel names. */
const legacyChannels: Record<string, Channel> = {
  all: Channel.Master,
  game: Channel.Game,
  chat: Channel.Chat,
  media: Channel.Media,
  aux: Channel.Aux,
};

@action({ UUID: "com.stellar.steelseries-sonar-controls.switch-output" })
export class LegacySwitchOutput extends SingletonAction<SwitchOutputSettings> {
  private readonly sonarInstance = new SonarClassic();

  override async onKeyDown(
    ev: KeyDownEvent<SwitchOutputSettings>,
  ): Promise<void> {
    await runAction(ev.action, "Legacy switch-output", async () => {
      const channel = legacyChannels[ev.payload.settings.channelToChange] ?? Channel.Master;
      const output = parseSavedAudioDevice(ev.payload.settings.outputToChangeTo);
      if (!output) throw new Error("No output device selected");
      await this.sonarInstance.switchDevice(channel, output);
    });
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, SwitchOutputSettings>,
  ): Promise<void> {
    const outputs = await listAudioDevicesForUi(() => this.sonarInstance.getAudioDevices());
    const options = outputs
      .filter((output) => output.type === AudioDeviceType.Output)
      .map((output) => ({ label: output.name, value: output.id }));

    streamDeck.ui.sendToPropertyInspector({
      event: "getOutputs",
      items: options,
    });
  }
}

/**
 * Settings for {@link SwitchOutput}.
 */
type SwitchOutputSettings = {
  channelToChange: string;
  outputToChangeTo: string;
};
