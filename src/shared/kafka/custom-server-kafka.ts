import { ServerKafka, CustomTransportStrategy } from '@nestjs/microservices';
import { EachMessagePayload } from 'kafkajs';
import { Logger } from '@nestjs/common';

/**
 * CustomServerKafka (Intelligent Routing & Unwrapping Edition)
 * 
 * Supports "Single Topic per Service" by extracting the real message pattern
 * and data from the message value.
 */
export class CustomServerKafka extends ServerKafka implements CustomTransportStrategy {
  protected readonly logger = new Logger('CustomServerKafka');
  private readonly mainTopic: string;

  constructor(options: any, mainTopic: string) {
    super(options);
    this.mainTopic = mainTopic;
  }
  
  public async listen(callback: (err?: unknown, ...args: unknown[]) => void) {
    const originalBindEvents = this.bindEvents.bind(this);
    this.bindEvents = async (consumer: any) => {
      await consumer.subscribe({ topics: [this.mainTopic], fromBeginning: true });
      await originalBindEvents(consumer);
    };
    return super.listen(callback);
  }

  public async handleMessage(payload: EachMessagePayload) {
    const { message, topic } = payload;
    let pattern: string = '';
    let finalData: any = null;
    let isWrapped = false;

    try {
      // Safety check for null value (TS18047 fix)
      const valueStr = message.value ? message.value.toString() : null;
      
      if (valueStr && valueStr.startsWith('{')) {
        const parsed = JSON.parse(valueStr);
        if (parsed && parsed.pattern) {
          pattern = parsed.pattern;
          finalData = parsed.data; // Unwrap the data
          isWrapped = true;
        }
      }
    } catch (e) {}

    if (!pattern) {
      const key = message.key ? message.key.toString() : '';
      pattern = (key && key !== topic) ? key : topic;
    }

    // If we unwrapped the data, we need to modify the message value for NestJS
    if (isWrapped && finalData !== null) {
      const bufferData = typeof finalData === 'string' ? finalData : JSON.stringify(finalData);
      payload.message.value = Buffer.from(bufferData);
    }
    
    this.logger.log(`[Routing] Topic: ${topic}, Pattern: ${pattern}`);
    
    return super.handleMessage({
      ...payload,
      topic: pattern,
    });
  }
}
