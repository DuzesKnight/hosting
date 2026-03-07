import { BadRequestException } from '@nestjs/common';
import * as net from 'net';
import * as url from 'url';

/** Private/internal IP ranges that must be blocked to prevent SSRF */
const PRIVATE_RANGES = [
    // IPv4 private
    { start: '10.0.0.0', end: '10.255.255.255' },
    { start: '172.16.0.0', end: '172.31.255.255' },
    { start: '192.168.0.0', end: '192.168.255.255' },
    // Loopback
    { start: '127.0.0.0', end: '127.255.255.255' },
    // Link-local
    { start: '169.254.0.0', end: '169.254.255.255' },
    // AWS metadata
    { start: '169.254.169.254', end: '169.254.169.254' },
    // Docker bridge
    { start: '172.17.0.0', end: '172.17.255.255' },
];

function ipToLong(ip: string): number {
    const parts = ip.split('.').map(Number);
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateIp(ip: string): boolean {
    if (!net.isIPv4(ip)) return true; // Block non-IPv4 by default
    const long = ipToLong(ip);
    return PRIVATE_RANGES.some(range => {
        const start = ipToLong(range.start);
        const end = ipToLong(range.end);
        return long >= start && long <= end;
    });
}

/**
 * Validates a URL to prevent SSRF attacks.
 * - Blocks private/internal IPs, loopback, link-local, metadata endpoints
 * - Only allows http/https protocols
 * - Blocks URLs resolving to internal hostnames
 */
export function validateExternalUrl(inputUrl: string): void {
    if (!inputUrl || typeof inputUrl !== 'string') {
        throw new BadRequestException('URL is required');
    }

    let parsed: URL;
    try {
        parsed = new URL(inputUrl);
    } catch {
        throw new BadRequestException('Invalid URL format');
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new BadRequestException('Only HTTP and HTTPS URLs are allowed');
    }

    // Block obvious internal hostnames
    const hostname = parsed.hostname.toLowerCase();
    const blockedHostnames = [
        'localhost', '0.0.0.0', '[::]', '[::1]',
        'metadata.google.internal', 'metadata.internal',
        'instance-data', 'kubernetes.default',
    ];
    if (blockedHostnames.some(blocked => hostname === blocked || hostname.endsWith('.' + blocked))) {
        throw new BadRequestException('URLs targeting internal services are not allowed');
    }

    // Block direct IP addresses in private ranges
    if (net.isIPv4(hostname) && isPrivateIp(hostname)) {
        throw new BadRequestException('URLs targeting private IP addresses are not allowed');
    }

    // Block common cloud metadata endpoints
    if (hostname === '169.254.169.254' || hostname.includes('metadata')) {
        throw new BadRequestException('URLs targeting cloud metadata services are not allowed');
    }
}
