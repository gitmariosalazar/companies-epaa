export class MessageResponse {
  message: string;
  object: any;

  constructor(message: string, object: any) {
    this.message = message;
    this.object = object;
  }

  toString(): string {
    return `MessageResponse{message='${this.message}', object=${this.object}}`;
  }
}
