import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import { ENV_KEYS, EnvironmentVariables } from '../config/env.constants';
import { validateEnvironment } from '../config/env.validation';
import { ProviderSettingsModule } from '../provider-settings/provider-settings.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000, // 1 minute
          limit: 5, // 5 attempts
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<EnvironmentVariables, true>,
      ): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: configService.getOrThrow<string>(ENV_KEYS.DB_HOST),
        port: configService.getOrThrow<number>(ENV_KEYS.DB_PORT),
        username: configService.getOrThrow<string>(ENV_KEYS.DB_USERNAME),
        password: configService.getOrThrow<string>(ENV_KEYS.DB_PASSWORD),
        database: configService.getOrThrow<string>(ENV_KEYS.DB_DATABASE),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    AuthModule,
    ProviderSettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
