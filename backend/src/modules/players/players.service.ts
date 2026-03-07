import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PterodactylClientService } from '../pterodactyl/pterodactyl-client.service';

@Injectable()
export class PlayersService {
    private readonly logger = new Logger(PlayersService.name);

    constructor(private pterodactylClient: PterodactylClientService) { }

    /**
     * Validate Minecraft player name to prevent command injection.
     * Java Edition: 3-16 chars, [a-zA-Z0-9_]
     * Bedrock (Geyser): May start with ".", allow spaces, up to 32 chars
     */
    private validatePlayerName(name: string): string {
        const trimmed = name?.trim();
        if (!trimmed) {
            throw new BadRequestException('Player name is required');
        }
        if (trimmed.length > 32) {
            throw new BadRequestException('Player name too long (max 32 characters)');
        }
        // Allow: letters, digits, underscore, dot (Bedrock prefix), space (Bedrock names)
        // Block: newlines, semicolons, slashes, and other injection characters
        if (!/^[\w. ]{1,32}$/.test(trimmed)) {
            throw new BadRequestException('Invalid player name. Only letters, numbers, underscores, dots, and spaces are allowed.');
        }
        return trimmed;
    }

    /**
     * Sanitize reason text to prevent command injection.
     * Strips newlines/tabs and limits to 200 characters.
     */
    private sanitizeReason(reason?: string): string | undefined {
        if (!reason) return undefined;
        return reason.replace(/[\r\n\t]+/g, ' ').substring(0, 200).trim() || undefined;
    }

    /**
     * Validate an IP string (IPv4/IPv6) to prevent command injection.
     */
    private validateIp(ip: string): string {
        const value = ip?.trim();
        if (!value) {
            throw new BadRequestException('IP is required');
        }
        if (value.length > 64) {
            throw new BadRequestException('IP is too long');
        }
        if (!/^[0-9a-fA-F:.]+$/.test(value)) {
            throw new BadRequestException('Invalid IP address format');
        }
        return value;
    }

    /**
     * Quote command args that contain spaces so Bedrock names remain a single argument.
     */
    private quoteArg(value: string): string {
        return value.includes(' ') ? `"${value}"` : value;
    }

    private normalizeUuid(value?: string | null): string | null {
        const trimmed = value?.trim().toLowerCase();
        if (!trimmed) return null;
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(trimmed)) {
            return trimmed;
        }
        if (/^[0-9a-f]{32}$/.test(trimmed)) {
            return `${trimmed.slice(0, 8)}-${trimmed.slice(8, 12)}-${trimmed.slice(12, 16)}-${trimmed.slice(16, 20)}-${trimmed.slice(20)}`;
        }
        return null;
    }

    private isDirectory(entry: any): boolean {
        return entry?.is_file === false || entry?.mime === 'inode/directory';
    }

    private readServerPropertiesLevelName(content: string | null): string {
        if (!content) return 'world';
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            if (!trimmed.startsWith('level-name=')) continue;
            const raw = trimmed.substring('level-name='.length).trim().replace(/\\/g, '/');
            const cleaned = raw.replace(/^\/+/, '');
            if (!cleaned || cleaned.includes('..')) return 'world';
            return cleaned;
        }
        return 'world';
    }

    private async getUserCacheMaps(serverUuid: string): Promise<{ byUuid: Map<string, string>; byName: Map<string, string> }> {
        const byUuid = new Map<string, string>();
        const byName = new Map<string, string>();
        const usercache = await this.readJsonFile(serverUuid, '/usercache.json');
        for (const row of usercache) {
            const name = typeof row?.name === 'string' ? row.name.trim() : '';
            const uuid = this.normalizeUuid(typeof row?.uuid === 'string' ? row.uuid : null);
            if (!name || !uuid) continue;
            byUuid.set(uuid, name);
            byName.set(name.toLowerCase(), uuid);
        }
        return { byUuid, byName };
    }

    private async getWorldDirs(serverUuid: string): Promise<string[]> {
        const worldDirs = new Set<string>();
        const serverProperties = await this.pterodactylClient.getFileContents(serverUuid, '/server.properties');
        const levelName = this.readServerPropertiesLevelName(serverProperties);

        [
            `/${levelName}`,
            `/${levelName}_nether`,
            `/${levelName}_the_end`,
            '/world',
            '/world_nether',
            '/world_the_end',
        ].forEach((dir) => worldDirs.add(dir));

        try {
            const rootEntries = await this.pterodactylClient.listFiles(serverUuid, '/');
            for (const entry of rootEntries) {
                if (!this.isDirectory(entry)) continue;
                const name = String(entry?.name || '').trim().replace(/^\/+/, '');
                if (!name || name.startsWith('.') || name.includes('..') || name.includes('\\')) continue;
                const dir = `/${name}`;
                if (worldDirs.has(dir)) continue;
                const children = await this.pterodactylClient.listFiles(serverUuid, dir).catch(() => []);
                const childNames = children.map((c: any) => String(c?.name || '').toLowerCase());
                if (childNames.includes('playerdata') || childNames.includes('stats') || childNames.includes('advancements')) {
                    worldDirs.add(dir);
                }
            }
        } catch (e) {
            this.logger.warn(`Failed to enumerate world directories for ${serverUuid}: ${e.message}`);
        }

        const confirmed: string[] = [];
        for (const dir of worldDirs) {
            const children = await this.pterodactylClient.listFiles(serverUuid, dir).catch(() => []);
            const childNames = children.map((c: any) => String(c?.name || '').toLowerCase());
            if (childNames.includes('playerdata') || childNames.includes('stats') || childNames.includes('advancements')) {
                confirmed.push(dir);
            }
        }

        if (confirmed.length > 0) return confirmed;
        return [`/${levelName}`];
    }

    private async ensureOfflineForPlayerDataDelete(serverUuid: string): Promise<void> {
        const resources = await this.pterodactylClient.getServerResources(serverUuid);
        const state = String(resources?.current_state || '').toLowerCase();
        if (state && state !== 'offline') {
            throw new BadRequestException('Stop your server before deleting player data.');
        }
    }

    private async resolvePlayerDataUuid(serverUuid: string, identifier: string): Promise<string> {
        const trimmed = identifier?.trim();
        if (!trimmed) {
            throw new BadRequestException('Player name or UUID is required');
        }
        const parsedUuid = this.normalizeUuid(trimmed);
        if (parsedUuid) return parsedUuid;
        const { byName } = await this.getUserCacheMaps(serverUuid);
        const fromCache = byName.get(trimmed.toLowerCase());
        if (!fromCache) {
            throw new BadRequestException('Unknown player name. Use a UUID or a player that has joined before.');
        }
        return fromCache;
    }

    /**
     * Read and parse a Minecraft JSON file (whitelist.json, banned-players.json, ops.json).
     * Returns empty array on failure with proper logging.
     */
    private async readJsonFile(serverUuid: string, filePath: string): Promise<any[]> {
        try {
            const content = await this.pterodactylClient.getFileContents(serverUuid, filePath);
            if (!content) return [];
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            this.logger.warn(`Failed to read ${filePath} on server ${serverUuid}: ${e.message}`);
            return [];
        }
    }

    /** Small delay to let Minecraft flush JSON files after a command */
    private delay(ms = 500): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // ========== DETECTION ==========

    async isMinecraftServer(serverUuid: string): Promise<boolean> {
        try {
            const files = await this.pterodactylClient.listFiles(serverUuid, '/');
            const names = files.map((f: any) => f.name?.toLowerCase());
            return names.includes('server.properties') || names.includes('plugins') || names.includes('mods');
        } catch (e) {
            this.logger.error(`Failed to detect Minecraft server ${serverUuid}: ${e.message}`);
            return false;
        }
    }

    // ========== ONLINE PLAYERS ==========

    /**
     * Get online players by sending 'list' command and parsing latest.log.
     * Note: This reads the full log file which can be large on busy servers.
     * Falls back gracefully if the log is unreadable or too large.
     */
    async getOnlinePlayers(serverUuid: string): Promise<{ count: number; max: number; players: string[] }> {
        const empty = { count: 0, max: 0, players: [] };
        try {
            const sent = await this.pterodactylClient.sendCommand(serverUuid, 'list');
            if (!sent) return empty;

            // Wait for the command to execute and the log to be written
            await this.delay(1500);

            const logContent = await this.pterodactylClient.getFileContents(serverUuid, '/logs/latest.log');
            if (!logContent) return empty;

            // Parse last 50 lines for the list response
            const lines = logContent.split('\n').slice(-50);
            for (let i = lines.length - 1; i >= 0; i--) {
                // Vanilla: "There are X of a max of Y players online: Player1, Player2"
                const match = lines[i].match(/There are (\d+) of a max of (\d+) players online:\s*(.*)/i);
                if (match) {
                    const count = parseInt(match[1], 10);
                    const max = parseInt(match[2], 10);
                    const playersStr = match[3]?.trim();
                    const players = playersStr
                        ? playersStr.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
                        : [];
                    return { count, max, players };
                }
                // Paper/Spigot variant: "There are X/Y players"
                const altMatch = lines[i].match(/There are (\d+)\/(\d+) players/i);
                if (altMatch) {
                    return { count: parseInt(altMatch[1], 10), max: parseInt(altMatch[2], 10), players: [] };
                }
            }

            return empty;
        } catch (e) {
            this.logger.error(`Failed to get online players for ${serverUuid}: ${e.message}`);
            return empty;
        }
    }

    // ========== WHITELIST ==========

    async getWhitelist(serverUuid: string): Promise<any[]> {
        return this.readJsonFile(serverUuid, '/whitelist.json');
    }

    async addToWhitelist(serverUuid: string, player: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const result = await this.pterodactylClient.sendCommand(serverUuid, `whitelist add ${this.quoteArg(name)}`);
        if (result) await this.delay();
        return result;
    }

    async removeFromWhitelist(serverUuid: string, player: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const result = await this.pterodactylClient.sendCommand(serverUuid, `whitelist remove ${this.quoteArg(name)}`);
        if (result) {
            // Some servers need an explicit reload to update the JSON
            await this.pterodactylClient.sendCommand(serverUuid, 'whitelist reload');
            await this.delay();
        }
        return result;
    }

    // ========== BAN / UNBAN ==========

    async getBannedPlayers(serverUuid: string): Promise<any[]> {
        return this.readJsonFile(serverUuid, '/banned-players.json');
    }

    async banPlayer(serverUuid: string, player: string, reason?: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const safeReason = this.sanitizeReason(reason);
        const cmd = safeReason ? `ban ${this.quoteArg(name)} ${safeReason}` : `ban ${this.quoteArg(name)}`;
        const result = await this.pterodactylClient.sendCommand(serverUuid, cmd);
        if (result) await this.delay();
        return result;
    }

    async unbanPlayer(serverUuid: string, player: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const result = await this.pterodactylClient.sendCommand(serverUuid, `pardon ${this.quoteArg(name)}`);
        if (result) await this.delay();
        return result;
    }

    // ========== BANNED IPS ==========

    async getBannedIps(serverUuid: string): Promise<any[]> {
        return this.readJsonFile(serverUuid, '/banned-ips.json');
    }

    async banIp(serverUuid: string, ip: string, reason?: string): Promise<boolean> {
        const safeIp = this.validateIp(ip);
        const safeReason = this.sanitizeReason(reason);
        const cmd = safeReason ? `ban-ip ${safeIp} ${safeReason}` : `ban-ip ${safeIp}`;
        const result = await this.pterodactylClient.sendCommand(serverUuid, cmd);
        if (result) await this.delay();
        return result;
    }

    async unbanIp(serverUuid: string, ip: string): Promise<boolean> {
        const safeIp = this.validateIp(ip);
        const result = await this.pterodactylClient.sendCommand(serverUuid, `pardon-ip ${safeIp}`);
        if (result) await this.delay();
        return result;
    }

    // ========== PLAYER DATA ==========

    async getPlayerData(serverUuid: string): Promise<{ players: any[]; worlds: string[] }> {
        const worldDirs = await this.getWorldDirs(serverUuid);
        const { byUuid } = await this.getUserCacheMaps(serverUuid);
        const players = new Map<string, { uuid: string; name: string | null; worlds: Set<string>; files: Set<string>; lastModified: string | null }>();

        for (const world of worldDirs) {
            const playerdataDir = `${world}/playerdata`;
            const files = await this.pterodactylClient.listFiles(serverUuid, playerdataDir).catch(() => []);
            for (const file of files) {
                const name = String(file?.name || '');
                if (!name.endsWith('.dat')) continue;
                const uuid = this.normalizeUuid(name.slice(0, -4));
                if (!uuid) continue;
                const current = players.get(uuid) || {
                    uuid,
                    name: byUuid.get(uuid) || null,
                    worlds: new Set<string>(),
                    files: new Set<string>(),
                    lastModified: null,
                };
                current.worlds.add(world);
                current.files.add(`${playerdataDir}/${name}`);
                const modified = typeof file?.modified_at === 'string'
                    ? file.modified_at
                    : (typeof file?.modifiedAt === 'string' ? file.modifiedAt : null);
                if (modified && (!current.lastModified || modified > current.lastModified)) {
                    current.lastModified = modified;
                }
                players.set(uuid, current);
            }
        }

        const rows = Array.from(players.values())
            .map((row) => ({
                uuid: row.uuid,
                name: row.name,
                worlds: Array.from(row.worlds),
                files: Array.from(row.files),
                fileCount: row.files.size,
                lastModified: row.lastModified,
            }))
            .sort((a, b) => {
                const aKey = (a.name || a.uuid).toLowerCase();
                const bKey = (b.name || b.uuid).toLowerCase();
                return aKey.localeCompare(bKey);
            });

        return { players: rows, worlds: worldDirs };
    }

    async deletePlayerData(serverUuid: string, identifier: string): Promise<{ uuid: string; deletedFiles: string[]; deletedCount: number }> {
        await this.ensureOfflineForPlayerDataDelete(serverUuid);
        const uuid = await this.resolvePlayerDataUuid(serverUuid, identifier);
        const compact = uuid.replace(/-/g, '');
        const worldDirs = await this.getWorldDirs(serverUuid);
        const deletedFiles: string[] = [];

        for (const world of worldDirs) {
            const targets: Array<{ root: string; names: string[] }> = [
                { root: `${world}/playerdata`, names: [`${uuid}.dat`, `${compact}.dat`] },
                { root: `${world}/stats`, names: [`${uuid}.json`, `${compact}.json`] },
                { root: `${world}/advancements`, names: [`${uuid}.json`, `${compact}.json`] },
            ];

            for (const target of targets) {
                const existing = await this.pterodactylClient.listFiles(serverUuid, target.root).catch(() => []);
                const existingNames = new Set(existing.map((file: any) => String(file?.name || '')));
                const toDelete = target.names.filter((name) => existingNames.has(name));
                if (toDelete.length === 0) continue;
                const deleted = await this.pterodactylClient.deleteFiles(serverUuid, target.root, toDelete);
                if (!deleted) {
                    this.logger.warn(`Failed to delete some player data files in ${target.root} for ${uuid}`);
                    continue;
                }
                for (const name of toDelete) {
                    deletedFiles.push(`${target.root}/${name}`);
                }
            }
        }

        if (deletedFiles.length === 0) {
            throw new BadRequestException('No player data files found for this player.');
        }

        return { uuid, deletedFiles, deletedCount: deletedFiles.length };
    }

    // ========== OPS ==========

    async getOps(serverUuid: string): Promise<any[]> {
        return this.readJsonFile(serverUuid, '/ops.json');
    }

    async opPlayer(serverUuid: string, player: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const result = await this.pterodactylClient.sendCommand(serverUuid, `op ${this.quoteArg(name)}`);
        if (result) await this.delay();
        return result;
    }

    async deopPlayer(serverUuid: string, player: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const result = await this.pterodactylClient.sendCommand(serverUuid, `deop ${this.quoteArg(name)}`);
        if (result) await this.delay();
        return result;
    }

    // ========== KICK ==========

    async kickPlayer(serverUuid: string, player: string, reason?: string): Promise<boolean> {
        const name = this.validatePlayerName(player);
        const safeReason = this.sanitizeReason(reason);
        const cmd = safeReason ? `kick ${this.quoteArg(name)} ${safeReason}` : `kick ${this.quoteArg(name)}`;
        return this.pterodactylClient.sendCommand(serverUuid, cmd);
    }
}
