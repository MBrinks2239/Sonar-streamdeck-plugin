export function convertChannelNameToHumanReadable(channel: string): string {
  switch (channel) {
    case "master":
      return "Master";
    case "game":
      return "Game";
    case "chatRender":
      return "Chat";
    case "media":
      return "Media";
    case "aux":
      return "Aux";
    case "chatCapture":
      return "Mic";
    default:
      return channel;
  }
}

export function getChannelIcon(channel: string): string {
  switch (channel) {
    case "master":
      return "imgs/channels/master-icon.svg";
    case "game":
      return "imgs/channels/game-icon.svg";
    case "chatRender":
      return "imgs/channels/chatRender-icon.svg";
    case "media":
      return "imgs/channels/media-icon.svg";
    case "aux":
      return "imgs/channels/aux-icon.svg";
    case "chatCapture":
      return "imgs/channels/chatCapture-icon.svg";
    default:
      return channel;
  }
}

export function getNextChannel(currentChannel: string): string {
  const channels = ["master", "game", "chatRender", "media", "aux", "chatCapture"];
  const currentIndex = channels.indexOf(currentChannel);  
  if (currentIndex === -1) {
    return channels[0]; // Default to the first channel if current is not found
  }
  const nextIndex = (currentIndex + 1) % channels.length; // Loop back to the start
  return channels[nextIndex];
}