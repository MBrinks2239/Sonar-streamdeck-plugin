export enum Channel {
  Master = "master",
  Game = "game",
  Chat = "chatRender",
  Media = "media",
  Aux = "aux",
  Mic = "chatCapture",
}

export function enumKeyFromValue<E extends Record<string, string>>(
  e: E,
  value: E[keyof E]
): keyof E | undefined {
  return (Object.keys(e) as Array<keyof E>).find((k) => e[k] === value);
}

export default Channel;