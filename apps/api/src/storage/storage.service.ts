import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describeError } from '../common/describe-error.js';
import type { Env } from '../config/env.js';

// Almacenamiento de archivos sobre la API de S3 (MinIO en desarrollo). Solo usa S3 estándar,
// así que cambiar de proveedor es cuestión de variables de entorno.
@Injectable()
export class StorageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;
  private bucketReady?: Promise<void>;
  readonly bucket: string;

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('S3_BUCKET', { infer: true });
    this.s3 = new S3Client({
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      region: config.get('S3_REGION', { infer: true }),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY', { infer: true }),
        secretAccessKey: config.get('S3_SECRET_KEY', { infer: true }),
      },
      // MinIO y la mayoría de los S3 propios no usan un subdominio por bucket.
      forcePathStyle: true,
      maxAttempts: 2,
      requestHandler: { connectionTimeout: 2_000, requestTimeout: 5_000 },
      // Los checksums por defecto del SDK no los soportan todos los S3 compatibles.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  onModuleInit() {
    // Sin await: si MinIO todavía no levantó, el API arranca igual y se reintenta en el próximo uso.
    this.ensureBucket().catch((err: unknown) =>
      this.logger.warn(
        `No se pudo preparar el bucket "${this.bucket}": ${describeError(err)}`,
      ),
    );
  }

  onModuleDestroy() {
    this.s3.destroy();
  }

  ensureBucket(): Promise<void> {
    this.bucketReady ??= this.createBucketIfMissing().catch((err: unknown) => {
      this.bucketReady = undefined;
      throw err;
    });
    return this.bucketReady;
  }

  private async createBucketIfMissing() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (err) {
      const notFound =
        err instanceof S3ServiceException &&
        err.$metadata.httpStatusCode === 404;
      if (!notFound) throw err;
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" creado`);
    }
  }
}
