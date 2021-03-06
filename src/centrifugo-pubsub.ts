import { CentrifugoClient } from 'graphql-centrifugo-client';
import { PubSubEngine } from 'graphql-subscriptions';
import { PubSubAsyncIterator } from './pubsub-async-iterator';

export interface PubSubCentrifugoOptions {
  centrifugoClient: CentrifugoClient,
}

export class CentrifugoPubSub implements PubSubEngine {
  private centrifugoClient: CentrifugoClient;
  private subscriptionMap: { [subId: number]: [string, Function] } = {};
  private subsRefsMap: { [trigger: string]: Array<number> } = {};
  private currentSubscriptionId: number = 0;
  private id: string;
  private iterators: Array<PubSubAsyncIterator<any>> = [];

  constructor(options: PubSubCentrifugoOptions) {
    this.centrifugoClient = options.centrifugoClient;
    this.id = this.centrifugoClient.getId();
    this.centrifugoClient.setOnMessageCallback(this.onMessage.bind(this));
  }

  public publish(trigger: string, payload: any): boolean {
    // TODO: implement method
    return false;
  }

  public subscribe(triggerName: string, onMessage: Function, options?: Object): Promise<number> {
    const id = this.currentSubscriptionId++;
    this.subscriptionMap[id] = [triggerName, onMessage];

    const refs = this.subsRefsMap[triggerName];
    if (refs && refs.length > 0) {
      this.subsRefsMap[triggerName] = [...refs, id];
      return Promise.resolve(id);
    } else {
      return new Promise<number>((resolve, reject) => {
        let lastMessageId = null;

        if (options && options['lastMessageId']) {
          lastMessageId = options['lastMessageId'];
        }

        this.centrifugoClient.subscribe(triggerName, lastMessageId);

        this.subsRefsMap[triggerName] = [...(this.subsRefsMap[triggerName] || []), id];

        resolve(id);
      });
    }
  }

  public unsubscribe(subId: number) {
    const [triggerName = null] = this.subscriptionMap[subId] || [];
    const refs = this.subsRefsMap[triggerName];

    if (!refs) throw new Error(`There is no subscription of id "${subId}"`);

    if (refs.length === 1) {
      this.centrifugoClient.unsubscribe(triggerName);
      delete this.subsRefsMap[triggerName];
    } else {
      const index = refs.indexOf(subId);
      this.subsRefsMap[triggerName] = index === -1 ? refs : [...refs.slice(0, index), ...refs.slice(index + 1)];
    }

    delete this.subscriptionMap[subId];
  }

  public asyncIterator<T>(triggers: string | string[], options?: Object): AsyncIterator<T> {
    const iterator = new PubSubAsyncIterator<T>(this, triggers, options);
    this.iterators.push(iterator);

    return iterator;
  }

  public close() {

    let closes = [];

    for (const iterator of this.iterators) {
      closes.push(iterator.close());
    }

    Promise.all(closes).then(() => {
        this.centrifugoClient.close();
        this.centrifugoClient = null;

        this.iterators = null;
    });
  }

  protected onMessage(channel: string, message: string) {
    const subscribers = this.subsRefsMap[channel];

    // Don't work for nothing..
    if (!subscribers || !subscribers.length) return;

    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (e) {
      parsedMessage = message;
    }

    for (const subId of subscribers) {
      const [, listener] = this.subscriptionMap[subId];
      listener(parsedMessage, channel);
    }
  }
}