import {CentrifugoPubSub} from "./centrifugo-pubsub";
import {CentrifugoClient, CentrifugoClientOptions} from "graphql-centrifugo-client";

export class PubSubFactory {
    protected centrifugoClientOptions: CentrifugoClientOptions;
    protected idPrefix: string;

    public constructor(options: CentrifugoClientOptions) {
        this.centrifugoClientOptions = options;
    }

    public create(): CentrifugoPubSub {
        const pubSubOptions = {
            centrifugoClient: new CentrifugoClient(this.centrifugoClientOptions),
        };

        return new CentrifugoPubSub(pubSubOptions);
    }
}