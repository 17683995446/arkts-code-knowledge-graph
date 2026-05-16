import { cosmiconfig } from 'cosmiconfig';
import { ConfigurationSchema, ApplicationConfiguration } from '../../shared/index.js';
import { applicationLogger } from '../logger/index.js';

const MODULE_NAME = 'arkts-code-graph';

/** 应用程序配置加载器 */
export class ApplicationConfigurationLoader {
    private static cachedConfig?: ApplicationConfiguration;

    /**
     * 从文件或默认值加载配置
     * @param searchDirectory 配置搜索目录
     * @param overrideConfig 覆盖配置
     * @returns 加载并验证后的配置
     */
    static async loadConfiguration(
        searchDirectory: string = process.cwd(),
        overrideConfig?: Partial<ApplicationConfiguration>
    ): Promise<ApplicationConfiguration> {
        if (ApplicationConfigurationLoader.cachedConfig && !overrideConfig) {
            return ApplicationConfigurationLoader.cachedConfig;
        }

        let loadedConfig: Partial<ApplicationConfiguration> = {};
        try {
            const explorer = cosmiconfig(MODULE_NAME);
            const result = await explorer.search(searchDirectory);
            if (result?.config) {
                applicationLogger.debug(`Configuration loaded from: ${result.filepath}`);
                loadedConfig = result.config;
            }
            else {
                applicationLogger.debug('No configuration file found, using defaults');
            }
        }
        catch (error) {
            applicationLogger.debug('Error loading configuration file, using defaults:', error);
        }

        const finalConfig = {
            ...loadedConfig,
            ...overrideConfig
        };

        const validatedConfig = ConfigurationSchema.parse(finalConfig);
        ApplicationConfigurationLoader.cachedConfig = validatedConfig;
        applicationLogger.info('Configuration loaded and validated');
        return validatedConfig;
    }

    /**
     * 清除配置缓存
     */
    static clearConfigurationCache(): void {
        ApplicationConfigurationLoader.cachedConfig = undefined;
    }
}

export { ConfigurationSchema };
export type { ApplicationConfiguration };
