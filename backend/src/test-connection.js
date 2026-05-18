const net = require('net');

const HOST = '37.27.189.85';
const PORT = 5432;
const TIMEOUT = 5000; // 5 seconds timeout

console.log(`[Connectivity Test] Attempting TCP socket connection to ${HOST}:${PORT}...`);

const socket = new net.Socket();
let startTime = Date.now();

socket.setTimeout(TIMEOUT);

socket.connect(PORT, HOST, () => {
  const duration = Date.now() - startTime;
  console.log(`\n======================================================`);
  console.log(`✅ SUCCESS: TCP connection successfully established!`);
  console.log(`- Remote Host: ${HOST}`);
  console.log(`- Port: ${PORT}`);
  console.log(`- Handshake Latency: ${duration}ms`);
  console.log(`- Status: Network path is open and reachable.`);
  console.log(`======================================================\n`);
  socket.destroy();
});

socket.on('error', (err) => {
  const duration = Date.now() - startTime;
  console.log(`\n======================================================`);
  console.log(`❌ FAILURE: TCP connection failed after ${duration}ms!`);
  console.log(`- Error Code: ${err.code}`);
  console.log(`- System Message: ${err.message}`);
  console.log(`\n[Possible Root Causes]:`);
  if (err.code === 'ECONNREFUSED') {
    console.log(`  👉 Connection Refused: The remote host is online, but the PostgreSQL service is NOT running on port 5432, OR it is not listening on the public interface (listen_addresses = '*' is not set).`);
  } else if (err.code === 'ETIMEDOUT') {
    console.log(`  👉 Timeout: The network packet was silently dropped. This is a classic symptom of a Firewall blocking port 5432 (UFW on Ubuntu, or Hetzner Cloud Security Groups).`);
  } else {
    console.log(`  👉 Network Unreachable: Host may be offline or routing is blocked.`);
  }
  console.log(`======================================================\n`);
  socket.destroy();
});

socket.on('timeout', () => {
  console.log(`\n======================================================`);
  console.log(`❌ FAILURE: Connection timed out!`);
  console.log(`- Limit: ${TIMEOUT}ms`);
  console.log(`- Status: Packet dropped. Check remote firewall rules.`);
  console.log(`======================================================\n`);
  socket.destroy();
});
