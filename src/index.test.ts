import * as gcpLogger from '.';

const fakeCredentials = {
  type: 'service_account',
  project_id: 'gcp-logger',
  private_key_id: 'abcdefghijklmnopqrstuvwxyz01234567890123',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nexample\n-----END PRIVATE KEY-----\n',
  client_email: 'test@example.iam.gserviceaccount.com',
  client_id: '123456789012345678901',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url:
    'https://www.googleapis.com/robot/v1/metadata/x509/test%40example.iam.gserviceaccount.com',
};

describe('gcp-logger', () => {
  it('should export a createLogger function', () => {
    expect.assertions(1);

    expect(gcpLogger.createLogger).toBeDefined();
  });

  describe('createLogger', () => {
    it('should return logger and flush function', () => {
      expect.assertions(2);

      const credentials = { ...fakeCredentials };

      const { logger, flush } = gcpLogger.createLogger({ credentials });

      expect(typeof logger).toBe('object');
      expect(typeof flush).toBe('function');
    });
  });
});
