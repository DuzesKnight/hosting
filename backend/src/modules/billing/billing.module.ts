import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { ServersModule } from '../servers/servers.module';
import { PterodactylModule } from '../pterodactyl/pterodactyl.module';
import { DiscordModule } from '../discord/discord.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [ConfigModule, ServersModule, PterodactylModule, DiscordModule, AuthModule],
    controllers: [BillingController],
    providers: [BillingService],
    exports: [BillingService],
})
export class BillingModule { }
