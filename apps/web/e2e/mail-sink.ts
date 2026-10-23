import { createServer, type Server } from "node:http";
import { simpleParser } from "mailparser";
import { SMTPServer } from "smtp-server";

export const SMTP_PORT = 2525;
export const HTTP_PORT = 2526;

export type SinkMessage = { to: string[]; subject: string; text: string };

// Buzón de prueba: recibe los mails del API por SMTP (sin auth ni TLS) y los expone por HTTP.
const messages: SinkMessage[] = [];

function listen(server: SMTPServer | Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
}

function close(server: SMTPServer | Server): Promise<void> {
  return new Promise((resolve) => server.close(() => resolve()));
}

export async function startMailSink(): Promise<() => Promise<void>> {
  const smtp = new SMTPServer({
    authOptional: true,
    disabledCommands: ["STARTTLS"],
    onData(stream, _session, callback) {
      simpleParser(stream).then(
        (mail) => {
          const to = [mail.to].flat().flatMap((a) => a?.value ?? []);
          messages.push({
            to: to.map((a) => (a.address ?? "").toLowerCase()),
            subject: mail.subject ?? "",
            text: mail.text ?? "",
          });
          callback();
        },
        (error: Error) => callback(error),
      );
    },
  });

  const http = createServer((req, res) => {
    if (req.url === "/messages" && req.method === "GET") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(messages));
    } else if (req.url === "/messages" && req.method === "DELETE") {
      messages.length = 0;
      res.writeHead(204).end();
    } else {
      res.writeHead(404).end();
    }
  });

  await listen(smtp, SMTP_PORT);
  await listen(http, HTTP_PORT);
  return async () => {
    http.closeAllConnections();
    await Promise.all([close(smtp), close(http)]);
  };
}
