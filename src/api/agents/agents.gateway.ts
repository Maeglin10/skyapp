import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { LLMService } from '../../core/llm/llm.service';
import { RunAgentDto } from './dto/run-agent.dto';
import { LLMProviderKey } from '../../core/agent/agent.types';

@WebSocketGateway({ cors: { origin: '*' } })
export class AgentsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AgentsGateway.name);
  
  constructor(private llm: LLMService) {}

  afterInit(server: Server) {
    this.logger.log('Agents WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('stream')
  async handleStream(@MessageBody() dto: RunAgentDto, @ConnectedSocket() client: Socket) {
    try {
      const provider = (dto.provider ?? 'anthropic') as LLMProviderKey;
      const tokenStream = this.llm.stream(
        provider,
        [{ role: 'user', content: dto.message }],
        undefined,
        dto.systemPrompt,
      );

      for await (const token of tokenStream) {
        client.emit('stream_token', { data: token });
      }
      
      client.emit('stream_end', { status: 'completed' });
    } catch (error: any) {
      this.logger.error(`Stream error: ${error.message}`);
      client.emit('stream_error', { error: error.message });
    }
  }
}
