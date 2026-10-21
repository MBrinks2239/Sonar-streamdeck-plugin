import streamDeck, {
  action,
  DidReceiveSettingsEvent,
  KeyDownEvent,
  SendToPluginEvent,
  SingletonAction,
} from "@elgato/streamdeck";
import type { JsonValue } from "@elgato/utils";
import SonarStreamer from "../../managers/streamer-sonar";
import { AudioDevice, AudioDeviceType, parseSavedAudioDevice } from "../../types/audio-device";
import { StreamRedirectionId } from "../../types/stream-redirection";
import { listAudioDevicesForUi, runAction } from "../../util/action";

@action({ UUID: "com.stellar.steelseries-sonar-controls.streamer.switch-output" })
export class StreamerSwitchOutput extends SingletonAction<StreamerSwitchOutputSettings> {
  private readonly sonarInstance = new SonarStreamer();

  override async onKeyDown(
    ev: KeyDownEvent<StreamerSwitchOutputSettings>,
  ): Promise<void> {
    const slider = ev.payload.settings.selectedSlider || StreamRedirectionId.Streaming;

    await runAction(ev.action, "Streamer switch-output", async () => {
      const output = parseSavedAudioDevice(ev.payload.settings.audioDeviceJson);
      if (!output) throw new Error("No output device selected");
      streamDeck.logger.info(
        `Streamer switch-output: slider=${slider} device=${output.name ?? output.id}`,
      );
      await this.sonarInstance.switchStreamOutput(slider, output);
    });
  }

  override onDidReceiveSettings(
    ev: DidReceiveSettingsEvent<StreamerSwitchOutputSettings>,
  ): Promise<void> | void {
    if (!ev.payload.settings.wasUi) return;
    const outputDevice = JSON.parse(ev.payload.settings.audioDeviceJson) as AudioDevice;
    ev.action.setSettings({
      ...ev.payload.settings,
      outputToChangeTo: JSON.stringify(outputDevice),
      wasUi: false,
    });
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, StreamerSwitchOutputSettings>,
  ): Promise<void> {
    const outputs = await listAudioDevicesForUi(() => this.sonarInstance.getAudioDevices());
    const options = outputs
      .filter((output) => output.type === AudioDeviceType.Output)
      .map((output) => ({ label: output.name, value: JSON.stringify(output) }));

    streamDeck.ui.sendToPropertyInspector({
      event: "getOutputs",
      items: options,
    });
  }
}

type StreamerSwitchOutputSettings = {
  selectedSlider: StreamRedirectionId;
  audioDeviceJson: string;
  outputToChangeTo?: string;
  wasUi: boolean;
};
