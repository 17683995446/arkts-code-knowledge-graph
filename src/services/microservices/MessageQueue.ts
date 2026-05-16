import * as crypto from 'crypto';

export type MessageQueueType = 'kafka' | 'rabbitmq' | 'redis' | 'sqs' | 'memory';

export interface MessageQueueConfig {
  type: MessageQueueType;
  brokers?: string[];
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  queueName: string;
  groupId?: string;
  autoCommit: boolean;
  maxRetries: number;
  retryDelay: number;
}

export interface QueueMessage {
  messageId: string;
  topic: string;
  payload: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  partition?: number;
  offset?: number;
}

export interface ConsumerConfig {
  topic: string;
  groupId: string;
  autoCommit: boolean;
  concurrency: number;
  batchSize: number;
}

export interface ProducerConfig {
  topic: string;
  partition?: number;
  compression?: 'none' | 'gzip' | 'snappy';
}

export interface MessageHandler<T = unknown> {
  (message: QueueMessage<T>): Promise<void>;
}

export interface QueueStats {
  messagesProduced: number;
  messagesConsumed: number;
  messagesFailed: number;
  latency: {
    p50: number;
    p90: number;
    p99: number;
  };
}

export interface TopicInfo {
  name: string;
  partitions: number;
  replicationFactor: number;
  messages: number;
}

export abstract class MessageQueue {
  protected config: MessageQueueConfig;
  protected producer: QueueProducer | null = null;
  protected consumers: Map<string, QueueConsumer> = new Map();
  protected stats: QueueStats = {
    messagesProduced: 0,
    messagesConsumed: 0,
    messagesFailed: 0,
    latency: { p50: 0, p90: 0, p99: 0 },
  };

  constructor(config: MessageQueueConfig) {
    this.config = config;
  }

  abstract produce(message: QueueMessage): Promise<void>;
  abstract subscribe(topic: string, handler: MessageHandler): Promise<string>;
  abstract unsubscribe(consumerId: string): Promise<void>;
  abstract createTopic(topic: string, partitions?: number, replicationFactor?: number): Promise<void>;
  abstract deleteTopic(topic: string): Promise<void>;
  abstract getTopicInfo(topic: string): Promise<TopicInfo>;
  abstract listTopics(): Promise<string[]>;
  abstract getStats(): QueueStats;

  protected generateMessageId(): string {
    return crypto.randomUUID();
  }

  protected async executeWithRetry<T>(fn: () => Promise<T>, retries: number): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }
}

export interface QueueProducer {
  send(message: QueueMessage): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
}

export interface QueueConsumer {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

export class MemoryQueueProducer implements QueueProducer {
  private messages: QueueMessage[] = [];

  async send(message: QueueMessage): Promise<void> {
    this.messages.push(message);
  }

  async flush(): Promise<void> {
    this.messages = [];
  }

  async close(): Promise<void> {
    this.messages = [];
  }

  getMessages(): QueueMessage[] {
    return this.messages;
  }
}

export class MemoryQueueConsumer implements QueueConsumer {
  private running = false;
  private handler: MessageHandler;
  private messages: QueueMessage[];
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(messages: QueueMessage[], handler: MessageHandler) {
    this.messages = messages;
    this.handler = handler;
  }

  async start(): Promise<void> {
    this.running = true;
    this.processMessages();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private async processMessages(): Promise<void> {
    while (this.running && this.messages.length > 0) {
      const message = this.messages.shift();
      if (message) {
        try {
          await this.handler(message);
        } catch {
          this.messages.push(message);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

export class MemoryMessageQueue extends MessageQueue {
  private topics: Map<string, QueueMessage[]> = new Map();

  constructor(config: MessageQueueConfig) {
    super(config);
    this.producer = new MemoryQueueProducer();
  }

  async produce(message: QueueMessage): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not initialized');
    }

    const msgWithId: QueueMessage = {
      ...message,
      messageId: message.messageId || this.generateMessageId(),
      timestamp: message.timestamp || Date.now(),
    };

    const topicMessages = this.topics.get(message.topic) || [];
    topicMessages.push(msgWithId);
    this.topics.set(message.topic, topicMessages);

    await this.producer.send(msgWithId);
    this.stats.messagesProduced++;
  }

  async subscribe(topic: string, handler: MessageHandler): Promise<string> {
    const consumerId = this.generateMessageId();
    const messages = this.topics.get(topic) || [];
    const consumer = new MemoryQueueConsumer(messages, async (msg) => {
      try {
        await handler(msg);
        this.stats.messagesConsumed++;
      } catch {
        this.stats.messagesFailed++;
      }
    });

    this.consumers.set(consumerId, consumer);
    await consumer.start();

    return consumerId;
  }

  async unsubscribe(consumerId: string): Promise<void> {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      await consumer.stop();
      this.consumers.delete(consumerId);
    }
  }

  async createTopic(topic: string, partitions: number = 1, replicationFactor: number = 1): Promise<void> {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, []);
    }
  }

  async deleteTopic(topic: string): Promise<void> {
    this.topics.delete(topic);
  }

  async getTopicInfo(topic: string): Promise<TopicInfo> {
    const messages = this.topics.get(topic) || [];
    return {
      name: topic,
      partitions: 1,
      replicationFactor: 1,
      messages: messages.length,
    };
  }

  async listTopics(): Promise<string[]> {
    return Array.from(this.topics.keys());
  }

  getStats(): QueueStats {
    return this.stats;
  }
}

export class MessageQueueFactory {
  static create(config: MessageQueueConfig): MessageQueue {
    switch (config.type) {
      case 'kafka':
      case 'rabbitmq':
      case 'redis':
      case 'sqs':
      default:
        return new MemoryMessageQueue(config);
    }
  }
}

export class EventBus {
  private queue: MessageQueue;
  private handlers: Map<string, MessageHandler[]> = new Map();

  constructor(queue: MessageQueue) {
    this.queue = queue;
  }

  async publish(event: string, payload: unknown): Promise<void> {
    await this.queue.produce({
      messageId: crypto.randomUUID(),
      topic: event,
      payload,
      timestamp: Date.now(),
    });
  }

  async subscribe(event: string, handler: MessageHandler): Promise<string> {
    const handlers = this.handlers.get(event) || [];
    handlers.push(handler);
    this.handlers.set(event, handlers);

    return this.queue.subscribe(event, async (message) => {
      const eventHandlers = this.handlers.get(event) || [];
      for (const h of eventHandlers) {
        await h(message);
      }
    });
  }

  unsubscribe(event: string, consumerId: string): Promise<void> {
    return this.queue.unsubscribe(consumerId);
  }
}

export const events = {
  CODE_PARSED: 'code.parsed',
  GRAPH_UPDATED: 'graph.updated',
  ANALYSIS_COMPLETE: 'analysis.complete',
  SEARCH_INDEXED: 'search.indexed',
  ERROR_OCCURRED: 'error.occurred',
  METRICS_UPDATED: 'metrics.updated',
};