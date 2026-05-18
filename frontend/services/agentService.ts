const API_BASE = '/api';

export interface AgentMessage {
  role: 'user' | 'model';
  text: string;
  timestamp?: number;
}

export interface ChatRequest {
  message: string;
  user_profile?: {
    target_role: string;
    current_role: string;
    timeline_months: number;
  };
  roadmap_state?: any[];
  current_week?: number;
  user_id?: string;
  conversation_id?: string;
}

export interface ChatResponse {
  response: string;
  conversation_id: string;
  tools_called?: { name: string; args: any }[];
}

export interface AgentHealth {
  status: string;
  tools_count: number;
}

type GetTokenFn = () => Promise<string | null>;

class AgentService {
  private conversationId: string | null = null;
  private getToken: GetTokenFn | null = null;

  setTokenGetter(getToken: GetTokenFn) {
    this.getToken = getToken;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async checkHealth(): Promise<AgentHealth | null> {
    try {
      const response = await fetch(`${API_BASE}/agent/health`);
      return response.json();
    } catch (error) {
      console.error('Agent health check failed:', error);
      return null;
    }
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const payload: ChatRequest = {
      ...request,
      conversation_id: this.conversationId || undefined,
      user_id: request.user_id || 'default',
    };

    const response = await fetch(`${API_BASE}/agent/chat`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Agent request failed: ${response.status}`);
    }

    const data: ChatResponse = await response.json();
    this.conversationId = data.conversation_id;
    return data;
  }

  async *streamMessage(request: ChatRequest): AsyncGenerator<string, void, unknown> {
    const payload: ChatRequest = {
      ...request,
      conversation_id: this.conversationId || undefined,
      user_id: request.user_id || 'default',
    };

    const response = await fetch(`${API_BASE}/agent/chat`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Agent request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      yield buffer;
    }
  }

  getConversationId(): string | null {
    return this.conversationId;
  }

  resetConversation(): void {
    this.conversationId = null;
  }

  async resetOnServer(conversationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/agent/reset`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify({ conversation_id: conversationId }),
      });
      const data = await response.json();
      if (data.success) {
        this.conversationId = null;
      }
      return data.success;
    } catch (error) {
      console.error('Reset conversation failed:', error);
      return false;
    }
  }
}

export const agentService = new AgentService();
export default agentService;
