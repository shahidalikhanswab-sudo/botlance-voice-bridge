export type TwilioConnectedMessage = {
  event: "connected";
  protocol: string;
  version: string;
};

export type TwilioStartMessage = {
  event: "start";
  sequenceNumber: string;
  streamSid: string;
  start: {
    accountSid: string;
    streamSid: string;
    callSid: string;
    tracks: string[];
    customParameters?: Record<string, string>;
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
};

export type TwilioMediaMessage = {
  event: "media";
  sequenceNumber: string;
  streamSid: string;
  media: {
    track?: string;
    chunk?: string;
    timestamp?: string;
    payload: string;
  };
};

export type TwilioStopMessage = {
  event: "stop";
  sequenceNumber: string;
  streamSid: string;
  stop: {
    accountSid: string;
    callSid: string;
  };
};

export type TwilioMarkMessage = {
  event: "mark";
  sequenceNumber: string;
  streamSid: string;
  mark: { name: string };
};

export type TwilioDtmfMessage = {
  event: "dtmf";
  sequenceNumber: string;
  streamSid: string;
  dtmf: { track: string; digit: string };
};

export type TwilioIncomingMessage =
  | TwilioConnectedMessage
  | TwilioStartMessage
  | TwilioMediaMessage
  | TwilioStopMessage
  | TwilioMarkMessage
  | TwilioDtmfMessage;
