import { computeAtmosphereLut } from './AtmosphereLutJob.js';
const scope = self;
scope.onmessage = (event) => {
    try {
        const result = computeAtmosphereLut(event.data);
        scope.postMessage(result, [result.data]);
    }
    catch (error) {
        scope.postMessage({
            generation: event.data?.generation ?? -1,
            error: error instanceof Error ? error.stack ?? error.message : String(error),
        });
    }
};
//# sourceMappingURL=AtmosphereLutWorker.js.map