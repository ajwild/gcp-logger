import pino, { Level, Logger, LogEvent } from 'pino';
import pinoTransmitHttp from 'pino-transmit-http';
import { sign, isExpired } from 'jwebt';
import { prepareSignOptions } from 'jwebt-gcp';

import {
  DEFAULT_HEADERS,
  DEFAULT_LEVEL,
  DEFAULT_LOG_NAME,
  DEFAULT_RESOURCE,
  LOGGING_URL,
  SEVERITY_MAP,
  TOKEN_AUDIENCE,
  TOKEN_PREFIX,
} from './constants';

type Headers = { [key: string]: string };

export interface CreateLoggerOptions {
  audience?: string;
  credentials: {
    type?: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri?: string;
    token_uri?: string;
    auth_provider_x509_cert_url?: string;
    client_x509_cert_url?: string;
  };
  level?: Level;
  logName?: string;
  resource?: {
    type: string;
    labels?: {
      [key: string]: string;
    };
  };
  subtleCrypto?: SubtleCrypto;
  url?: string;
};

export interface GcpLogger {
  logger: Logger;
  flush: () => Promise<void> | void;
}

export function createLogger({
  audience = TOKEN_AUDIENCE,
  credentials,
  level = DEFAULT_LEVEL,
  logName,
  resource = DEFAULT_RESOURCE,
  subtleCrypto,
  url = LOGGING_URL,
}: CreateLoggerOptions): GcpLogger {
  async function onError(error: Error, data: string, headers: Headers) {
    // TODO: Handle retry if token has expired (resend data)
    console.error(error, data, headers);
  }
  
  async function createToken() {
    return sign(prepareSignOptions({ credentials, audience, subtleCrypto }));
  }
  
  async function prepareHeaders(headers: Headers): Promise<Headers> {
    if (!headers) {
      headers = {};
    }
  
    if (!headers.Authorization || isExpired(headers.Authorization.slice(TOKEN_PREFIX.length))) {
      const token = await createToken();
      headers.Authorization = `${TOKEN_PREFIX}${token}`;
    }
  
    return headers;
  }

  async function prepareBody(data: { [key: string]: any }): Promise<string> {
    const entries = data.map(({ ts, level: { label }, messages }: LogEvent) => ({
      timestamp: new Date(ts).toISOString(),
      severity: SEVERITY_MAP[label],
      textPayload: messages.join('\n'),
    }));
  
    return JSON.stringify({
      logName: (logName) ? logName : DEFAULT_LOG_NAME.replace('%projectId%', credentials.project_id),
      resource,
      entries,
      partialSuccess: true,
      dryRun: false
    });
  }

  const {
    flush,
    send,
  } = pinoTransmitHttp({
    headers: DEFAULT_HEADERS,
    onError,
    prepareHeaders,
    prepareBody,
    throttle: 1000,
    url,
    useSendBeacon: false,
    level,
  });

  const logger = pino({
    browser: {
      transmit: {
        level,
        send,
      },
    },
  });

  return {
    logger,
    flush,
  };
}
