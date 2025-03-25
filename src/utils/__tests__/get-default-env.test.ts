import * as fs from 'fs';
import { getDefaultEnvSync } from '../get-default-env';
import * as IN_PROC_CACHE from '../in-proc-cache';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

describe('getDefaultEnv', () => {
  beforeEach(() => {
    IN_PROC_CACHE.removeAll();
    jest.clearAllMocks();
  });

  it('When value exists in cache the cached value is returned', async () => {
    // Arrange
    IN_PROC_CACHE.set('getDefaultEnv', 'test-env');
    const getSpy = jest.spyOn(IN_PROC_CACHE, 'get');

    // Act
    const result = getDefaultEnvSync();

    // Assert
    expect(result).toBe('test-env');
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('When value does not exist in cache and no config file exists returns default', async () => {
    // Arrange
    const getSpy = jest.spyOn(IN_PROC_CACHE, 'get');
    jest.spyOn(fs, 'existsSync').mockImplementation(() => false);

    // Act
    const result = getDefaultEnvSync();

    // Assert
    expect(result).toBe('default');
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('When value does not exist in cache and config file exists returns config file value', async () => {
    // Arrange
    const getSpy = jest.spyOn(IN_PROC_CACHE, 'get');
    const setSpy = jest.spyOn(IN_PROC_CACHE, 'set');
    jest.spyOn(fs, 'existsSync').mockImplementation(() => true);
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => 'test-value');

    // Act
    const result = getDefaultEnvSync();

    // Assert
    expect(result).toBe('test-value');
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledTimes(2);
  });
});
