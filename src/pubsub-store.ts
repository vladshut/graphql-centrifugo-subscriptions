import { CentrifugoPubSub } from "./centrifugo-pubsub";
import {CentrifugoClient, CentrifugoClientOptions} from "graphql-centrifugo-client";

export class PubSubStore {
    private store = new Map<string, CentrifugoPubSub>();

    public get(options: CentrifugoClientOptions): CentrifugoPubSub {
        if (!this.hasPubsub(options.id)) {
            const centrifugoClient = new CentrifugoClient(options);
            const pubSubOptions = {
                centrifugoClient,
                onEmptySubscribers: this.removePubsub.bind(this),
            };
            const centrifugoPubSub = new CentrifugoPubSub(pubSubOptions);

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

    private removePubsub(key: string): void {
        if (this.store.has(key)) {
            this.store.delete(key);
        }
    }
}