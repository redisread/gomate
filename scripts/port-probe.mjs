import net from "node:net";

export function probePort(port, address) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (error) =>
      resolve(error.code === "EADDRNOTAVAIL" || error.code === "EAFNOSUPPORT"),
    );
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, address);
  });
}
