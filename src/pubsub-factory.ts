import {CentrifugoPubSub, PubSubCentrifugoOptions} from "./centrifugo-pubsub";
import {CentrifugoClient, CentrifugoClientOptions} from "graphql-centrifugo-client";
import {isNumber} from "util";

export class PubSubFactory {
    protected store = new Map<string, CentrifugoPubSub>();
    protected centrifugoClientOptions: CentrifugoClientOptions;
    protected keyPrefix: string;

    public constructor(options: CentrifugoClientOptions, keyPrefix: string = '') {
        this.centrifugoClientOptions = options;
        this.keyPrefix = keyPrefix;
    }

    public get(key: string | number = 'guest'): CentrifugoPubSub {
        key = this.prepareKey(key);

        if (!this.hasPubsub(key)) {
            this.setPubsub(key, this.createCentrifugoPubSub(key));
        }

        return this.getPubsub(key);
    }

    public remove(key: string): void {
        key = this.prepareKey(key);
        this.removePubsub(key);
    }

    protected getPubsub(key: string): CentrifugoPubSub {
        return this.store.get(key);
    }

    protected setPubsub(key: string, pubsub: CentrifugoPubSub): void {
        this.store.set(key, pubsub);
    }

    protected hasPubsub(key: string): boolean {
        return this.store.has(key);
    }

    protected removePubsub(key: string): void {
        if (this.store.has(key)) {
            this.store.delete(key);
        }
    }

    protected prepareKey(key: string | number): string {
        if (isNumber(key)) {
            key = key.toString()
        }

        return this.keyPrefix ? this.keyPrefix + '_' + key : key;
    }
    
    protected createCentrifugoPubSub(key: string): CentrifugoPubSub {
        const pubSubOptions = this.createPubSubOptions(key);

        return new CentrifugoPubSub(pubSubOptions);
    }
    
    protected createPubSubOptions(key: string): PubSubCentrifugoOptions {
        let centrifugoClientOptions = this.centrifugoClientOptions;
        centrifugoClientOptions.id = key;

        return {
            centrifugoClient: new CentrifugoClient(centrifugoClientOptions),
            onEmptySubscribers: this.removePubsub.bind(this),
        };
    }
}