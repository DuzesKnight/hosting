import { IsString, IsNumber, IsOptional, IsBoolean, IsIn, Min, Max, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

// ─── File Operations ─────────────────────────────────────

export class WriteFileDto {
    @IsString()
    @MinLength(1)
    file: string;

    @IsString()
    content: string;
}

export class DeleteFilesDto {
    @IsString()
    root: string;

    @IsString({ each: true })
    files: string[];
}

export class RenameFileDto {
    @IsString()
    root: string;

    @IsString()
    @MinLength(1)
    from: string;

    @IsString()
    @MinLength(1)
    to: string;
}

export class CreateDirectoryDto {
    @IsString()
    root: string;

    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name: string;
}

export class CompressFilesDto {
    @IsString()
    root: string;

    @IsString({ each: true })
    files: string[];
}

export class DecompressFileDto {
    @IsString()
    root: string;

    @IsString()
    @MinLength(1)
    file: string;
}

export class CopyFileDto {
    @IsString()
    @MinLength(1)
    location: string;
}

export class ChmodFilesDto {
    @IsString()
    root: string;

    files: { file: string; mode: string }[];
}

export class PullFileDto {
    @IsString()
    @MinLength(1)
    url: string;

    @IsString()
    directory: string;

    @IsString()
    @IsOptional()
    filename?: string;
}

// ─── Server Settings ─────────────────────────────────────

export class RenameServerDto {
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    name: string;
}

export class ChangeDockerImageDto {
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._\-/]+:[a-zA-Z0-9._\-]+$/, {
        message: 'Docker image must be in format repository:tag',
    })
    docker_image: string;
}

// ─── Startup ─────────────────────────────────────────────

export class UpdateStartupDto {
    @IsString()
    @MinLength(1)
    key: string;

    @IsString()
    value: string;
}

// ─── Databases ───────────────────────────────────────────

export class CreateDatabaseDto {
    @IsString()
    @MinLength(1)
    @MaxLength(48)
    @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Database name must be alphanumeric with underscores' })
    name: string;
}

// ─── Schedules ───────────────────────────────────────────

export class CreateScheduleDto {
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    name: string;

    @IsBoolean()
    is_active: boolean;

    @IsString()
    minute: string;

    @IsString()
    hour: string;

    @IsString()
    day_of_week: string;

    @IsString()
    day_of_month: string;

    @IsString()
    month: string;
}

export class CreateScheduleTaskDto {
    @IsString()
    @IsIn(['command', 'power', 'backup'])
    action: 'command' | 'power' | 'backup';

    @IsString()
    payload: string;

    @IsNumber()
    @Min(0)
    @Max(900)
    time_offset: number;

    @IsBoolean()
    @IsOptional()
    continue_on_failure?: boolean;
}

// ─── Backup Operations ──────────────────────────────────

export class RestoreBackupDto {
    @IsBoolean()
    @IsOptional()
    truncate?: boolean;
}

// ─── Console ─────────────────────────────────────────────

export class SendCommandDto {
    @IsString()
    @MinLength(1)
    @MaxLength(2000)
    command: string;
}

// ─── Billing ─────────────────────────────────────────────

export class CreatePaymentDto {
    @IsNumber()
    @Min(1)
    @Max(100000)
    amount: number;

    @IsString()
    @IsOptional()
    serverId?: string;
}

export class SubmitUpiDto {
    @IsString()
    @MinLength(6)
    @MaxLength(50)
    utr: string;

    @IsNumber()
    @Min(1)
    @Max(100000)
    amount: number;

    @IsString()
    @IsOptional()
    serverId?: string;

    @IsString()
    @IsOptional()
    planId?: string;
}

export class AddBalanceDto {
    @IsNumber()
    @Min(1)
    @Max(100000)
    amount: number;

    @IsString()
    @IsOptional()
    userId?: string;
}

// ─── VPS ─────────────────────────────────────────────────

export class ProvisionVpsDto {
    @IsString()
    @MinLength(1)
    planId: string;

    @IsString()
    @MinLength(1)
    os: string;

    @IsString()
    @MinLength(1)
    @MaxLength(100)
    hostname: string;
}

export class VpsActionDto {
    @IsString()
    @IsIn(['start', 'stop', 'restart', 'shutdown'])
    action: 'start' | 'stop' | 'restart' | 'shutdown';

    @IsString()
    @IsOptional()
    os?: string;
}
