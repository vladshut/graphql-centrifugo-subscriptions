import { CentrifugoPubSub } from "./centrifugo-pubsub";
import {CentrifugoClient, CentrifugoClientOptions} from "graphql-centrifugo-client";

export class PubSubStore {
    private store = new Map<string, CentrifugoPubSub>();
    private centrifugoClientOptions: CentrifugoClientOptions;
    private keyPrefix: string;

    public constructor(options: CentrifugoClientOptions, keyPrefix: string = '') {
        this.centrifugoClientOptions = options;
        this.keyPrefix = keyPrefix;
    }

    public get(key: string = 'guest'): CentrifugoPubSub {
        key = this.prepareKey(key);

        if (!this.hasPubsub(key)) {
            let options = this.centrifugoClientOptions;
            options.id = key;

            const centrifugoClient = new CentrifugoClient(options);
            const pubSubOptions = {
                centrifugoClient,
                onEmptySubscribers: this.removePubsub.bind(this),
            };

            const centrifugoPubSub = new CentrifugoPubSub(pubSubOptions);

            this.setPubsub(key, centrifugoPubSub);
        }

        return this.getPubsub(key);
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

    private prepareKey(key: string): string {
        return this.keyPrefix ? this.keyPrefix + '_' + key : key;
    }
}