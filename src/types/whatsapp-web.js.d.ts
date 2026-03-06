declare module "whatsapp-web.js" {
    export class Client {
        constructor(options?: Record<string, unknown>);
        info: Record<string, unknown> | undefined;
        on(event: string, callback: (...args: any[]) => void): void;
        sendMessage(chatId: string, content: string): Promise<{ id: { id: string } }>;
        initialize(): Promise<void>;
    }

    export class LocalAuth {
        constructor(options?: Record<string, unknown>);
    }
}
