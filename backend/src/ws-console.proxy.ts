import { Logger } from '@nestjs/common';
import { Server as HttpServer, IncomingMessage } from 'http';
import * as WebSocket from 'ws';
import * as url from 'url';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from './prisma/prisma.service';
import { PterodactylClientService } from './modules/pterodactyl/pterodactyl-client.service';

interface ProxyDeps {
    jwtSecret: string;
    prisma: PrismaService;
    pterodactylClient: PterodactylClientService;
}

/**
 * Attaches a WebSocket proxy to the HTTP server.
 * Routes: /api/servers/:serverId/ws
 *
 * The browser connects to OUR backend WebSocket, and we proxy all messages
 * to/from the Pterodactyl Wings daemon. This avoids Wings' Origin check
 * (which returns 403 when the browser's origin isn't in Wings allowed_origins).
 */
export function setupConsoleProxy(httpServer: HttpServer, deps: ProxyDeps) {
    const logger = new Logger('ConsoleProxy');
    const wss = new WebSocket.Server({ noServer: true });

    httpServer.on('upgrade', async (request: IncomingMessage, socket: any, head: Buffer) => {
        const parsed = url.parse(request.url || '', true);
        const match = parsed.pathname?.match(/^\/api\/servers\/([^/]+)\/ws$/);
        if (!match) {
            // Not our route — ignore (let other handlers or NestJS deal with it)
            return;
        }

        const serverId = match[1];

        try {
            // ── Authenticate ──
            const token = extractToken(request);
            if (!token) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            let userId: string;
            try {
                const decoded = jwt.verify(token, deps.jwtSecret) as any;
                userId = decoded.sub || decoded.id;
                if (!userId) throw new Error('No user id in token');
            } catch {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            // ── Verify server ownership ──
            const server = await deps.prisma.server.findFirst({
                where: { id: serverId, userId },
            });
            if (!server) {
                socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                socket.destroy();
                return;
            }

            const ref = server.pteroIdentifier || server.pteroUuid;
            if (!ref) {
                socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                socket.destroy();
                return;
            }

            // ── Get Pterodactyl websocket credentials ──
            let wsCreds: { socket: string; token: string };
            try {
                wsCreds = await deps.pterodactylClient.getWebsocketCredentials(ref);
            } catch (e: any) {
                logger.error(`Failed to get WS credentials for ${ref}: ${e.message}`);
                socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
                socket.destroy();
                return;
            }

            if (!wsCreds?.socket || !wsCreds?.token) {
                socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
                socket.destroy();
                return;
            }

            // ── Upgrade the client-side connection ──
            wss.handleUpgrade(request, socket, head, (clientWs) => {
                bridgeToWings(clientWs, wsCreds, ref, deps, logger);
            });
        } catch (e: any) {
            logger.error(`Console proxy error: ${e.message}`);
            try {
                socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                socket.destroy();
            } catch { /* socket already gone */ }
        }
    });

    logger.log('Console WebSocket proxy attached');
}

/**
 * Bridges a client WebSocket to the Pterodactyl Wings daemon WebSocket.
 */
function bridgeToWings(
    clientWs: WebSocket,
    creds: { socket: string; token: string },
    serverRef: string,
    deps: ProxyDeps,
    logger: Logger,
) {
    // Connect to Wings — Origin MUST match what Wings has in allowed_origins
    // (the Pterodactyl panel URL). Without this, Wings returns 403.
    const panelUrl = deps.pterodactylClient.panelUrl;
    const wingsWs = new WebSocket(creds.socket, {
        origin: panelUrl,
        headers: { Origin: panelUrl },
        rejectUnauthorized: false, // Wings often uses self-signed certs
    });

    let wingsReady = false;

    wingsWs.on('open', () => {
        wingsReady = true;
        // Authenticate with Wings using the Pterodactyl-issued token
        wingsWs.send(JSON.stringify({ event: 'auth', args: [creds.token] }));
    });

    // Wings → Client
    wingsWs.on('message', (data: WebSocket.Data) => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data.toString());
        }
    });

    // Client → Wings
    clientWs.on('message', (data: WebSocket.Data) => {
        const msg = data.toString();

        // Intercept auth messages from the client — we already authenticated
        // with our server-side token. But handle token refresh.
        try {
            const parsed = JSON.parse(msg);
            if (parsed?.event === 'auth') {
                // Client sent an auth event. We already authed server-side.
                // For token refresh, we need to get a new token from the panel.
                refreshToken(wingsWs, serverRef, deps, logger);
                return;
            }
        } catch { /* not JSON, pass through */ }

        if (wingsReady && wingsWs.readyState === WebSocket.OPEN) {
            wingsWs.send(msg);
        }
    });

    // Handle Wings close/error
    wingsWs.on('close', () => {
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(1000, 'Wings connection closed');
        }
    });

    wingsWs.on('error', (err) => {
        logger.warn(`Wings WS error for ${serverRef}: ${err.message}`);
        if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close(1011, 'Wings connection error');
        }
    });

    // Handle Client close/error
    clientWs.on('close', () => {
        if (wingsWs.readyState === WebSocket.OPEN) {
            wingsWs.close();
        }
    });

    clientWs.on('error', () => {
        if (wingsWs.readyState === WebSocket.OPEN) {
            wingsWs.close();
        }
    });

    // Handle token expiring from Wings
    wingsWs.on('message', (data: WebSocket.Data) => {
        try {
            const parsed = JSON.parse(data.toString());
            if (parsed?.event === 'token expiring') {
                refreshToken(wingsWs, serverRef, deps, logger);
            }
        } catch { /* ignore parse errors */ }
    });
}

/**
 * Refresh the Pterodactyl token and re-auth with Wings.
 */
async function refreshToken(
    wingsWs: WebSocket,
    serverRef: string,
    deps: ProxyDeps,
    logger: Logger,
) {
    try {
        const newCreds = await deps.pterodactylClient.getWebsocketCredentials(serverRef);
        if (newCreds?.token && wingsWs.readyState === WebSocket.OPEN) {
            wingsWs.send(JSON.stringify({ event: 'auth', args: [newCreds.token] }));
        }
    } catch (e: any) {
        logger.warn(`Token refresh failed for ${serverRef}: ${e.message}`);
    }
}

/**
 * Extract JWT from cookie or query parameter.
 */
function extractToken(request: IncomingMessage): string | null {
    // Try cookie first
    const cookieHeader = request.headers.cookie || '';
    const cookies = parseCookies(cookieHeader);
    if (cookies.token) return cookies.token;

    // Try query parameter
    const parsed = url.parse(request.url || '', true);
    if (typeof parsed.query.token === 'string') return parsed.query.token;

    // Try Authorization header
    const auth = request.headers.authorization || '';
    if (auth.startsWith('Bearer ')) return auth.slice(7);

    return null;
}

function parseCookies(header: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (!header) return cookies;
    for (const part of header.split(';')) {
        const eq = part.indexOf('=');
        if (eq < 0) continue;
        const key = part.slice(0, eq).trim();
        const value = part.slice(eq + 1).trim();
        cookies[key] = decodeURIComponent(value);
    }
    return cookies;
}
