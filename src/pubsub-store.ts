import { CentrifugoPubSub } from "./centrifugo-pubsub";
import { CentrifugoClientOptions } from "graphql-centrifugo-client";

export class PubSubStore {
    private store = new Map<string, CentrifugoPubSub>();

    public get(options: CentrifugoClientOptions): CentrifugoPubSub {
        if (!this.hasPubsub(options.id)) {
            const pubSubCentrifugoOptions = {
                centrifugoClientOptions: options,
            };

            const centrifugoPubSub = new CentrifugoPubSub(pubSubCentrifugoOptions);

            this.setPubsub(options.id, centrifugoPubSub);
        }

        return this.getPubsub(options.id);
    }

    private getPubsub(key: string): CentrifugoPubSub {
        return this.store.get(key);
    }

    private setPubsub(key: string, pubsub: CentrifugoPubSub): void {
        this.store.set(key, pubsub);
    }

    private hasPubsub(key: string): boolean {
        return this.store.has(key);
    }
}