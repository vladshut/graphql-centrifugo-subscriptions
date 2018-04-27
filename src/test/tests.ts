/* tslint:disable:no-empty */
import * as chai from 'chai';
import * as sinon from 'sinon';
import { LoggerInstance } from 'winston';
import { CentrifugoPubSub, PubSubCentrifugoOptions } from '../centrifugo-pubsub';
import {CentrifugoClient} from 'graphql-centrifugo-client';
import * as TypeMoq from 'typemoq';
import { spy } from 'simple-mock';

const now = new Date(1522070496648);
const pubSubId = 'some_id';
const centrifugoClientOptions = {
    path: 'ws://localhost:7070/',
    id: pubSubId,
    secret: 'secret',
    onMessageCallback: ((channel, message) => { throw new Error('should not be called!'); }),
    logger: {
        error: (msg: string, ...meta: any[]) => {},
    } as LoggerInstance,
};

let centrifugoClientInstance: CentrifugoClient;
let centrifugoClientMock: TypeMoq.IMock<CentrifugoClient>;
let centrifugoClient: CentrifugoClient;
let onEmptySubscribersSpy;
let mockOptions: PubSubCentrifugoOptions;


describe('CentrifugoPubSub', () => {
    let sandbox;
    let clock;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        clock = sinon.useFakeTimers(now.getTime());
        centrifugoClientInstance = new CentrifugoClient(centrifugoClientOptions);
        centrifugoClientMock = TypeMoq.Mock.ofInstance(centrifugoClientInstance, undefined, false);
        centrifugoClientMock.setup(x => x.getOnMessageCallback()).returns(() => centrifugoClientMock.target.getOnMessageCallback());
        let callback = c => { centrifugoClientMock.target.setOnMessageCallback(c); };
        centrifugoClientMock.setup(x => x.setOnMessageCallback(TypeMoq.It.isAny())).callback(callback);
        centrifugoClient = centrifugoClientMock.object;
        onEmptySubscribersSpy = spy((pubSubId: string) => {});
        mockOptions = {
            centrifugoClient: centrifugoClient,
            onEmptySubscribers: onEmptySubscribersSpy as Function,
        };
    });

    afterEach(() => {
        sandbox.restore();
        clock.restore();
        onEmptySubscribersSpy.reset();
    });

    it('allow to subscribe to specific channel and invoke callback when a message is published', function (done) {
        const pubSub = new CentrifugoPubSub(mockOptions);

        pubSub.subscribe('notifications', (channel, message) => {
            try {
                chai.expect(message).to.equals('test');
                chai.expect(channel).to.equals('notifications');
                done();
            } catch (e) {
                done(e);
            }
        }).then(subId => {
            chai.expect(subId).to.be.a('number');
        });
        centrifugoClient.getOnMessageCallback()('notifications', 'test');
    });

    it('allow to unsubscribe from specific channel', function (done) {
        const pubSub = new CentrifugoPubSub(mockOptions);
        pubSub.subscribe('notifications', () => null).then(subId => {
            pubSub.unsubscribe(subId);

            try {
                centrifugoClientMock.verify(x => x.unsubscribe('notifications'), TypeMoq.Times.once());
                done();

            } catch (e) {
                done(e);
            }
        });
    });

    it('cleans up correctly the memory when unsubscribing', function (done) {
        const pubSub = new CentrifugoPubSub(mockOptions);
        Promise.all([
            pubSub.subscribe('notifications', () => null),
            pubSub.subscribe('notifications', () => null),
        ])
            .then(([subId, secondSubId]) => {
                try {
                    // This assertion is done against a private member, if you change the internals, you may want to change that
                    chai.expect((pubSub as any).subscriptionMap[subId]).not.to.be.an('undefined');
                    pubSub.unsubscribe(subId);
                    // This assertion is done against a private member, if you change the internals, you may want to change that
                    chai.expect((pubSub as any).subscriptionMap[subId]).to.be.an('undefined');
                    chai.expect(() => pubSub.unsubscribe(subId)).to.throw(`There is no subscription of id "${subId}"`);
                    pubSub.unsubscribe(secondSubId);
                    done();

                } catch (e) {
                    done(e);
                }
            });
    });

    it('will not unsubscribe from the channel if there is another subscriber on it\'s subscriber list', function (done) {
        const pubSub = new CentrifugoPubSub(mockOptions);
        const subscriptionPromises = [
            pubSub.subscribe('notifications', () => {
                done('Not supposed to be triggered');
            }),
            pubSub.subscribe('notifications', (channel, message) => {
                try {
                    chai.expect(message).to.equals('test');
                    chai.expect(channel).to.equals('notifications');
                    done();
                } catch (e) {
                    done(e);
                }
            }),
        ];

        Promise.all(subscriptionPromises).then(subIds => {
            try {
                chai.expect(subIds.length).to.equals(2);

                pubSub.unsubscribe(subIds[0]);

                centrifugoClientMock.verify(x => x.unsubscribe('notifications'), TypeMoq.Times.never());

                centrifugoClient.getOnMessageCallback()('notifications', 'test');

                pubSub.unsubscribe(subIds[1]);

                centrifugoClientMock.verify(x => x.unsubscribe('notifications'), TypeMoq.Times.once());
            } catch (e) {
                done(e);
            }
        });
    });

    it('will subscribe to channel only once', function (done) {
        const pubSub = new CentrifugoPubSub(mockOptions);
        const onMessage = () => null;
        const subscriptionPromises = [
            pubSub.subscribe('notifications', onMessage),
            pubSub.subscribe('notifications', onMessage),
        ];

        Promise.all(subscriptionPromises).then(subIds => {
            try {
                chai.expect(subIds.length).to.equals(2);
                centrifugoClientMock.verify(x => x.subscribe('notifications', null), TypeMoq.Times.once());

                pubSub.unsubscribe(subIds[0]);
                pubSub.unsubscribe(subIds[1]);
                done();
            } catch (e) {
                done(e);
            }
        });
    });

    it('can have multiple subscribers and all will be called when a message is published to channel', function (done) {
        const pubSub = new CentrifugoPubSub(mockOptions);
        const onMessageSpy = spy(() => null);
        const subscriptionPromises = [
            pubSub.subscribe('notifications', onMessageSpy as Function),
            pubSub.subscribe('notifications', onMessageSpy as Function),
        ];

        Promise.all(subscriptionPromises).then(subIds => {
            try {
                chai.expect(subIds.length).to.equals(2);

                centrifugoClient.getOnMessageCallback()('notifications', 'test');

                chai.expect(onMessageSpy.callCount).to.equals(2);
                onMessageSpy.calls.forEach(call => {
                    chai.expect(call.args).to.have.members(['notifications', 'test']);
                });

                pubSub.unsubscribe(subIds[0]);
                pubSub.unsubscribe(subIds[1]);
                done();
            } catch (e) {
                done(e);
            }
        });
    });

    it('throws if you try to unsubscribe with an unknown id', function () {
        const pubSub = new CentrifugoPubSub(mockOptions);
        return chai.expect(() => pubSub.unsubscribe(123))
            .to.throw('There is no subscription of id "123"');
    });

    it('invoke onEmptySubscribers callback if it has no subscribers', function (done) {
        const pubSub = new CentrifugoPubSub(mockOptions);

        const subscriptionPromises = [
            pubSub.subscribe('notifications', () => {}),
        ];

        Promise.all(subscriptionPromises).then(subIds => {
            try {
                pubSub.unsubscribe(subIds[0]);
                chai.expect(onEmptySubscribersSpy.callCount).to.equals(1);
                done();
            } catch (e) {
                done(e);
            }
        });

    });
});
