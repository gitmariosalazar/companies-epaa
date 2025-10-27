export class ApiResponse {
  status_code: number;
  time: Date = new Date();
  message: any;
  url: string;
  result: any;

  constructor(message: any, result: any, url: string) {
    this.message = message;
    this.result = result;
    this.status_code = 201;
    this.url = url.replace('uri=', '');
  }
}
