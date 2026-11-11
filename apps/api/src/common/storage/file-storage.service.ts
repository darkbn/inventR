import { Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { EnvironmentVariables } from '../../config/env.validation';

export type StorageArea = 'uploads' | 'reports';

/**
 * Stockage des fichiers déposés et générés.
 *
 * Les deux répertoires sont montés comme volumes Docker en production. Le nom
 * de fichier est systématiquement regénéré : un nom fourni par l'utilisateur ne
 * doit jamais atteindre le système de fichiers, c'est la voie classique de la
 * traversée de répertoire (`../../etc/...`).
 */
@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly roots: Record<StorageArea, string>;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.roots = {
      uploads: path.resolve(config.get('STORAGE_UPLOAD_DIR', { infer: true })),
      reports: path.resolve(config.get('STORAGE_REPORT_DIR', { infer: true })),
    };
  }

  async onModuleInit(): Promise<void> {
    for (const [area, root] of Object.entries(this.roots)) {
      await mkdir(root, { recursive: true });
      this.logger.log(`Répertoire ${area} : ${root}`);
    }
  }

  /**
   * Écrit un fichier et renvoie son chemin **relatif**, seul enregistré en base :
   * la racine de stockage peut ainsi changer d'un environnement à l'autre.
   */
  async save(area: StorageArea, originalName: string, content: Buffer): Promise<string> {
    const extension = FileStorageService.safeExtension(originalName);
    const subdirectory = new Date().toISOString().slice(0, 7); // regroupement par mois
    const filename = `${randomUUID()}${extension}`;

    const directory = path.join(this.roots[area], subdirectory);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), content);

    return path.posix.join(subdirectory, filename);
  }

  async read(area: StorageArea, relativePath: string): Promise<Buffer> {
    const absolute = this.resolve(area, relativePath);

    try {
      return await readFile(absolute);
    } catch {
      throw new NotFoundException(
        'Le fichier est introuvable sur le serveur. Il a peut-être été purgé.',
      );
    }
  }

  async remove(area: StorageArea, relativePath: string): Promise<void> {
    try {
      await unlink(this.resolve(area, relativePath));
    } catch {
      // Un fichier déjà absent n'est pas une erreur : la suppression est idempotente.
    }
  }

  /**
   * Résout un chemin relatif en garantissant qu'il reste sous la racine.
   * Dernier rempart contre une valeur altérée en base.
   */
  private resolve(area: StorageArea, relativePath: string): string {
    const root = this.roots[area];
    const absolute = path.resolve(root, relativePath);

    if (!absolute.startsWith(root + path.sep) && absolute !== root) {
      throw new NotFoundException('Chemin de fichier invalide.');
    }

    return absolute;
  }

  /** N'accepte que les extensions attendues, en minuscules. */
  private static safeExtension(originalName: string): string {
    const extension = path.extname(originalName).toLowerCase();
    return /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : '';
  }
}
