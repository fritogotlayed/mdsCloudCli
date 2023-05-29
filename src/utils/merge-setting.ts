import { ENV_CONFIG_ELEMENTS } from './env-config-elements';

export function mergeSetting(target, source) {
  const result = { ...target };

  ENV_CONFIG_ELEMENTS.forEach((e) => {
    const { key } = e;
    if (source[key]) {
      result[key] = source[key];
    }
  });

  return result;
}
