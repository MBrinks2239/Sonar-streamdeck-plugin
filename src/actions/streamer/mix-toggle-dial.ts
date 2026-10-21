import { action } from "@elgato/streamdeck";
import { StreamRedirectionId } from "../../types/stream-redirection";
import { StreamerVolumeDial, StreamerVolumeDialSettings } from "./volume-dial";

/** Same as the streamer volume dial, but tapping the touch strip flips between the Streaming and Monitoring mix. */
@action({ UUID: "com.stellar.steelseries-sonar-controls.streamer.mix-toggle-dial" })
export class StreamerMixToggleDial extends StreamerVolumeDial {
  protected override readonly label = "Streamer mix-toggle-dial";

  protected override nextSettingsOnTouch(settings: StreamerVolumeDialSettings): StreamerVolumeDialSettings {
    const selectedSlider = settings.selectedSlider === StreamRedirectionId.Streaming
      ? StreamRedirectionId.Monitoring
      : StreamRedirectionId.Streaming;
    return { ...settings, selectedSlider };
  }
}
