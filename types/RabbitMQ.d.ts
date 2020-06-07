export namespace RabbitMQ {
  interface Config {
    enable: boolean;
    protocol: string;
    hostname: string;
    username: string;
    password: string;
    vhost: string;
  }

  interface Options {
    connectionOptions: {
      credentials: {
        mechanism: string;
        response(): Buffer;
        username: string;
        password: string;
      };
    };
  }
}
