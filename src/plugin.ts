import streamDeck from "@elgato/streamdeck";

import { MuteChannel } from "./actions/legacy/mute-channel";
import { SwitchOutput } from "./actions/legacy/switch-output";
import { SetVolume } from "./actions/legacy/set-volume";
import { LoadFullConfig } from "./actions/legacy/load-full-config";
import { SwitchInput } from "./actions/legacy/switch-input";
import { SetVolumeDial } from "./actions/classic/volume-dial";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("debug");

// Register actions.
streamDeck.actions.registerAction(new MuteChannel());
streamDeck.actions.registerAction(new SwitchOutput());
streamDeck.actions.registerAction(new SetVolume());
streamDeck.actions.registerAction(new LoadFullConfig());
streamDeck.actions.registerAction(new SwitchInput());
streamDeck.actions.registerAction(new SetVolumeDial());

// Finally, connect to the Stream Deck.
streamDeck.connect();
