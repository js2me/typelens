import { workspace } from 'vscode';
import { TypeLensConfiguration } from './TypeLensConfiguration';

export class AppConfiguration {
  private cachedSettings: TypeLensConfiguration;
  public extensionName = "typelens";
  constructor() {
    workspace.onDidChangeConfiguration(e => {
      this.cachedSettings = null;
    });
  }


  public typeLensEnabled: boolean = true;

  get settings(): TypeLensConfiguration {
    if (!this.cachedSettings) {
      var settings = workspace.getConfiguration(this.extensionName);
      this.cachedSettings = new TypeLensConfiguration();
      for (var propertyName in this.cachedSettings) {
        if (settings.has(propertyName)) {
          this.cachedSettings[propertyName] = settings.get(propertyName);
        }
      }
    }
    return this.cachedSettings;
  }
}