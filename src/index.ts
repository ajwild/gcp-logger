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

// eslint-disable-next-line functional/prefer-readonly-type
type Headers = { [key: string]: string } | null;

export type CreateLoggerOptions = {
  readonly audience?: string;
  readonly credentials: {
    readonly type?: string;
    readonly project_id: string;
    readonly private_key_id: string;
    readonly private_key: string;
    readonly client_email: string;
    readonly client_id: string;
    readonly auth_uri?: string;
    readonly token_uri?: string;
    readonly auth_provider_x509_cert_url?: string;
    readonly client_x509_cert_url?: string;
  };
  readonly level?: Level;
  readonly logName?: string;
  readonly resource?: {
    readonly type: string;
    readonly labels?: {
      readonly [key: string]: string;
    };
  };
  readonly subtleCrypto?: SubtleCrypto;
  readonly url?: string;
};

export type GcpLogger = {
  readonly logger: Logger & { readonly flush: () => Promise<void> | void };
  // eslint-disable-next-line functional/no-mixed-type
  readonly flush: () => Promise<void> | void;
};

export function createLogger({
  audience = TOKEN_AUDIENCE,
  credentials,
  level = DEFAULT_LEVEL,
  logName,
  resource = DEFAULT_RESOURCE,
  subtleCrypto,
  url = LOGGING_URL,
}: CreateLoggerOptions): GcpLogger {
  async function onError(
    error: Readonly<Error>,
    data: string,
    headers: Headers
  ): Promise<void> {
    console.error(error, data, headers);
  }

  async function createToken(): Promise<string> {
    return sign(prepareSignOptions({ credentials, audience, subtleCrypto }));
  }

  async function prepareHeaders(headers: Headers): Promise<Headers> {
    // Danger zone! Mutating headers to share JWT between requests.
    /* eslint-disable functional/immutable-data, no-param-reassign */
    if (!headers) {
      headers = {};
    }

    if (
      !headers.Authorization ||
      isExpired(headers.Authorization.slice(TOKEN_PREFIX.length))
    ) {
      const token = await createToken();
      headers.Authorization = `${TOKEN_PREFIX}${token}`;
    }

    return headers;
    /* eslint-enable functional/immutable-data, no-param-reassign */
  }

  async function prepareBody(data: {
    readonly [key: string]: any;
  }): Promise<string> {
    const entries = data.map(
      // Too lazy to implement DeepReadonly
      // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
      ({ ts, level: { label }, messages }: Readonly<LogEvent>) => ({
        timestamp: new Date(ts).toISOString(),
        severity: SEVERITY_MAP[label as Level],
        textPayload: messages.join('\n'),
      })
    );

    return JSON.stringify({
      logName: logName
        ? logName
        : DEFAULT_LOG_NAME.replace('%projectId%', credentials.project_id),
      resource,
      entries,
      partialSuccess: true,
      dryRun: false,
    });
  }

  const { flush, send } = pinoTransmitHttp({
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
