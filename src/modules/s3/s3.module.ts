import { S3Client } from '@aws-sdk/client-s3';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3_CLIENT, S3_CONFIG } from './constants';
import { S3ObjectService, S3UrlService } from './services';
import { S3Config } from './types';

@Global()
@Module({
  providers: [
    {
      provide: S3_CONFIG,
      useFactory: (configService: ConfigService): S3Config => ({
        endpoint: configService.getOrThrow<string>('S3_ENDPOINT'),
        region: configService.getOrThrow<string>('S3_REGION'),
        bucket: configService.getOrThrow<string>('S3_BUCKET'),
        publicUrl: configService.getOrThrow<string>('S3_PUBLIC_URL'),
        accessKeyId: configService.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: configService.getOrThrow<string>(
          'S3_SECRET_ACCESS_KEY',
        ),
        forcePathStyle: true,
      }),
      inject: [ConfigService],
    },
    {
      provide: S3_CLIENT,
      useFactory: (config: S3Config): S3Client => {
        return new S3Client({
          endpoint: config.endpoint,
          region: config.region,
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
          forcePathStyle: config.forcePathStyle,
        });
      },
      inject: [S3_CONFIG],
    },
    S3UrlService,
    S3ObjectService,
  ],
  exports: [S3UrlService, S3ObjectService],
})
export class S3Module {}
