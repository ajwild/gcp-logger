export const DEFAULT_HEADERS = {
  'content-type': 'application/json;charset=UTF-8',
};
export const DEFAULT_LEVEL = 'info';
export const DEFAULT_LOG_NAME = 'projects/%projectId%/logs/global';
export const DEFAULT_RESOURCE = { type: 'global' };
export const LOGGING_URL = 'https://logging.googleapis.com/v2/entries:write';
export const SEVERITY_MAP = {
  fatal: 'CRITICAL',
  error: 'ERROR',
  warn: 'WARNING',
  info: 'INFO',
  debug: 'DEBUG',
  trace: 'DEBUG',
};
export const TOKEN_AUDIENCE = 'https://logging.googleapis.com/';
export const TOKEN_PREFIX = 'Bearer ';
