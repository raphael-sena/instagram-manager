// Upload das mídias de teste para o bucket privado e geração de URLs pré-assinadas de leitura para a Meta.
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const TIPOS: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp4": "video/mp4" };

export class R2 {
  private readonly s3: S3Client;

  constructor(
    accountId: string,
    accessKeyId: string,
    secretAccessKey: string,
    private readonly bucket: string,
  ) {
    this.s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  /** Envia o arquivo com nome aleatório e devolve a chave. */
  async enviar(caminho: string): Promise<string> {
    const ext = extname(caminho).toLowerCase();
    const chave = `poc/${randomUUID()}${ext}`;
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: chave, Body: await readFile(caminho), ContentType: TIPOS[ext] }),
    );
    return chave;
  }

  /** URL de leitura temporária (padrão: 3 h). */
  urlLeitura(chave: string, segundos = 3 * 3600): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: chave }), { expiresIn: segundos });
  }

  async apagar(chave: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: chave }));
  }
}
