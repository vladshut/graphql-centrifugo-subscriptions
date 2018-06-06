import {CentrifugoPubSub, PubSubCentrifugoOptions} from "./centrifugo-pubsub";
import {CentrifugoClient, CentrifugoClientOptions} from "graphql-centrifugo-client";
import {isNumber} from "util";

export class PubSubFactory {
    protected centrifugoClientOptions: CentrifugoClientOptions;
    protected idPrefix: string;

    public constructor(options: CentrifugoClientOptions, idPrefix: string = '') {
        this.centrifugoClientOptions = options;
        this.idPrefix = idPrefix;
    }

    public get(id: string | number = 'guest'): CentrifugoPubSub {
        id = this.prepareId(id);

        return this.createCentrifugoPubSub(id);
    }

    protected prepareId(id: string | number): string {
        if (isNumber(id)) {
            id = id.toString()
        }

        return this.idPrefix ? this.idPrefix + '_' + id : id;
    }
    
    protected createCentrifugoPubSub(id: string): CentrifugoPubSub {
        const pubSubOptions = this.createPubSubOptions(id);

        return new CentrifugoPubSub(pubSubOptions);
    }
    
    protected createPubSubOptions(id: string): PubSubCentrifugoOptions {
        let centrifugoClientOptions = this.centrifugoClientOptions;
        centrifugoClientOptions.id = id;

        return {
            centrifugoClient: new CentrifugoClient(centrifugoClientOptions),
        };
    }
}