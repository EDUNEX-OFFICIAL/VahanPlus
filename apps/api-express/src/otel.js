import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

let sdk;

export function initOtel() {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return;
  }
  sdk = new NodeSDK({
    instrumentations: [getNodeAutoInstrumentations()],
  });
  sdk.start();
  process.on('SIGTERM', () => sdk?.shutdown());
}
