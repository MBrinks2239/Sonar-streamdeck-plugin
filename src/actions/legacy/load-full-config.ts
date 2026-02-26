import streamDeck, {
  action,
  KeyDownEvent,
  SendToPluginEvent,
  SingletonAction,
} from "@elgato/streamdeck";
import type {
	JsonValue
} from "@elgato/utils";
import sonar from "../../managers/legacy/sonar-controller";

@action({ UUID: "com.stellar.steelseries-sonar-controls.load-full-config" })
export class LoadFullConfig extends SingletonAction<LoadFullConfigSettings> {
  private readonly sonarInstance = new sonar();

  override async onKeyDown(
    ev: KeyDownEvent<LoadFullConfigSettings>,
  ): Promise<void> {
    const gameMuted = ev.payload.settings.gameChannelMute || false;
    const chatMuted = ev.payload.settings.chatChannelMute || false;
    const mediaMuted = ev.payload.settings.mediaChannelMute || false;
    const auxMuted = ev.payload.settings.auxChannelMute || false;
    const micMuted = ev.payload.settings.micChannelMute || false;

    this.sonarInstance.setVolume(
      "game",
      ev.payload.settings.gameChannelVolume / 100,
    );
    this.sonarInstance.switchOutput(
      "game",
      ev.payload.settings.gameChannelOutput,
    );
    this.sonarInstance.muteChannel("game", gameMuted);

    this.sonarInstance.setVolume(
      "chatRender",
      ev.payload.settings.chatChannelVolume / 100,
    );
    this.sonarInstance.switchOutput(
      "chat",
      ev.payload.settings.chatChannelOutput,
    );
    this.sonarInstance.muteChannel("chatRender", chatMuted);

    this.sonarInstance.setVolume(
      "media",
      ev.payload.settings.mediaChannelVolume / 100,
    );
    this.sonarInstance.switchOutput(
      "media",
      ev.payload.settings.mediaChannelOutput,
    );
    this.sonarInstance.muteChannel("media", mediaMuted);

    this.sonarInstance.setVolume(
      "aux",
      ev.payload.settings.auxChannelVolume / 100,
    );
    this.sonarInstance.switchOutput(
      "aux",
      ev.payload.settings.auxChannelOutput,
    );
    this.sonarInstance.muteChannel("aux", auxMuted);

    this.sonarInstance.setVolume(
      "chatCapture",
      ev.payload.settings.micChannelVolume / 100,
    );
    this.sonarInstance.switchOutput("mic", ev.payload.settings.micChannelInput);
    this.sonarInstance.muteChannel("chatCapture", micMuted);
  }

  override async onSendToPlugin(
    ev: SendToPluginEvent<JsonValue, LoadFullConfigSettings>,
  ): Promise<void> {
    const outputs = await this.sonarInstance.getAudioDevices();
    const outputOptions = outputs
      .filter((output) => output.dataFlow == "render" && output.role == "none")
      .map((output) => ({ label: output.friendlyName, value: output.id }));

    const inputOptions = outputs
      .filter((output) => output.dataFlow == "capture" && output.role == "none")
      .map((output) => ({ label: output.friendlyName, value: output.id }));

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
