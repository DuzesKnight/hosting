import { Module } from '@nestjs/common';
import { ServersController } from './servers.controller';
import { ServersService } from './servers.service';
import { PterodactylModule } from '../pterodactyl/pterodactyl.module';
import { AuthModule } from '../auth/auth.module';
import { DiscordModule } from '../discord/discord.module';
import { CloudflareModule } from '../cloudflare/cloudflare.module';

@Module({
    imports: [PterodactylModule, AuthModule, DiscordModule, CloudflareModule],
    controllers: [ServersController],
    providers: [ServersService],
    exports: [ServersService],
})
export class ServersModule { }
