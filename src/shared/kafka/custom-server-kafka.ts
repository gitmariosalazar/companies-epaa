import { ServerKafka, CustomTransportStrategy } from '@nestjs/microservices';
import { EachMessagePayload } from 'kafkajs';
import { Logger } from '@nestjs/common';

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
      await consumer.subscribe({ topics: [this.mainTopic], fromBeginning: false });
      await originalBindEvents(consumer);
    };
    return super.listen(callback);
  }

  public async handleMessage(payload: EachMessagePayload) {
    const { message, topic } = payload;
    let pattern: string = '';

    try {
      const valueStr = message.value ? message.value.toString() : null;

      if (valueStr && valueStr.startsWith('{')) {
        const parsed = JSON.parse(valueStr);

        if (parsed && parsed.pattern) {
          // Caso 1: client.send() con inner routing pattern
          // Formato: { id, pattern:'main_topic', data:{ pattern:'real.handler', data:{...} } }
          if (
            parsed.id &&
            parsed.data &&
            typeof parsed.data === 'object' &&
            parsed.data.pattern
          ) {
            pattern = parsed.data.pattern;
            // Reconstruir preservando id (correlationId) para que ServerKafka envíe la reply
            payload.message.value = Buffer.from(
              JSON.stringify({
                id: parsed.id,
                pattern: parsed.data.pattern,
                data: parsed.data.data !== undefined ? parsed.data.data : parsed.data,
              }),
            );
          }
          // Caso 2: kafkaProxy.send() fire-and-forget
          // Formato: { pattern:'real.handler', data:{...} }
          else {
            pattern = parsed.pattern;
            const finalData = parsed.data;
            if (finalData !== null && finalData !== undefined) {
              const bufferData =
                typeof finalData === 'string' ? finalData : JSON.stringify(finalData);
              payload.message.value = Buffer.from(bufferData);
            }
          }
        }
      }
    } catch (e) {
      this.logger.error(`[ParseError] ${e}`);
    }

    if (!pattern) {
      const key = message.key ? message.key.toString() : '';
      pattern = key && key !== topic ? key : topic;
    }

    this.logger.log(`[Routing] Topic: ${topic}, Pattern: ${pattern}`);

    return super.handleMessage({ ...payload, topic: pattern });
  }
}
