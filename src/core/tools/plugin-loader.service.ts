import { Injectable } from '@nestjs/common';

@Injectable()
export class PluginLoaderService {
  loadPlugins(): string[] {
    return [];
  }
}
