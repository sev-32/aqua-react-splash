import { computeAtmosphereLut, type AtmosphereLutJobRequest } from './AtmosphereLutJob.js';

const scope: any = self;
scope.onmessage = (event: MessageEvent<AtmosphereLutJobRequest>) => {
  try {
    const result = computeAtmosphereLut(event.data);
    scope.postMessage(result, [result.data]);
  } catch (error) {
    scope.postMessage({
      generation: event.data?.generation ?? -1,
      error: error instanceof Error ? error.stack ?? error.message : String(error),
    });
  }
};
