const fs = require('fs/promises');
const path = require('path');

const DEFAULT_CATALOG_DIR = path.join(__dirname, '../assets/catalogs');
const MEDIA_TYPES = new Set(['image', 'video', 'stream', 'data', 'sequence']);

class CatalogManager {
  constructor(options = {}) {
    this.catalogDir = options.catalogDir || process.env.AYNI_CATALOG_DIR || DEFAULT_CATALOG_DIR;
    this.cache = null;
    this.loadingPromise = null;
  }

  async getCatalogs() {
    if (this.cache) {
      return this._cloneCache();
    }

    if (!this.loadingPromise) {
      this.loadingPromise = this._loadCatalogsFromDisk();
    }

    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }

    return this._cloneCache();
  }

  async refreshCatalogs() {
    this.cache = null;
    return this.getCatalogs();
  }

  getDatasetById(datasetId) {
    if (!this.cache) {
      return null;
    }
    return this.cache.datasets.find((dataset) => dataset.id === datasetId) || null;
  }

  async _loadCatalogsFromDisk() {
    const datasets = [];
    const errors = [];
    const seenIds = new Set();
    const catalogDir = path.resolve(this.catalogDir);

    try {
      const stat = await fs.stat(catalogDir);
      if (!stat.isDirectory()) {
        errors.push({
          type: 'directory',
          message: `Catalog directory is not a folder: ${catalogDir}`
        });
        this.cache = { datasets: [], errors, lastUpdated: new Date().toISOString(), catalogDir };
        return;
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        errors.push({
          type: 'directory',
          message: `Catalog directory does not exist: ${catalogDir}`
        });
        this.cache = { datasets: [], errors, lastUpdated: new Date().toISOString(), catalogDir };
        return;
      }
      throw error;
    }

    const files = await fs.readdir(catalogDir);
    const jsonFiles = files.filter((file) => file.toLowerCase().endsWith('.json'));

    if (jsonFiles.length === 0) {
      errors.push({
        type: 'catalog',
        message: `No catalog JSON files found in ${catalogDir}`
      });
    }

    for (const fileName of jsonFiles) {
      const filePath = path.join(catalogDir, fileName);
      let payload;

      try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        payload = JSON.parse(fileContent);
      } catch (error) {
        errors.push({
          type: 'parse',
          file: fileName,
          message: `Failed to parse JSON: ${error.message}`
        });
        continue;
      }

      const catalogDatasets = this._extractDatasets(payload);
      if (!Array.isArray(catalogDatasets)) {
        errors.push({
          type: 'structure',
          file: fileName,
          message: 'Catalog JSON must be an array or contain a "datasets" array.'
        });
        continue;
      }

      catalogDatasets.forEach((dataset, index) => {
        const validation = this._validateDataset(dataset);

        if (!validation.valid) {
          errors.push({
            type: 'validation',
            file: fileName,
            datasetId: dataset && dataset.id,
            message: `Dataset at index ${index}: ${validation.error}`
          });
          return;
        }

        if (seenIds.has(validation.dataset.id)) {
          errors.push({
            type: 'duplicate',
            file: fileName,
            datasetId: validation.dataset.id,
            message: `Duplicate dataset id: ${validation.dataset.id}`
          });
          return;
        }

        seenIds.add(validation.dataset.id);
        datasets.push({
          ...validation.dataset,
          catalogFile: fileName
        });
      });
    }

    this.cache = {
      datasets,
      errors,
      lastUpdated: new Date().toISOString(),
      catalogDir
    };
  }

  _extractDatasets(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && Array.isArray(payload.datasets)) {
      return payload.datasets;
    }

    return null;
  }

  _validateDataset(rawDataset) {
    if (typeof rawDataset !== 'object' || rawDataset === null) {
      return { valid: false, error: 'Dataset entry must be an object.' };
    }

    const { id, name, mediaType, format, sourceUri, description, thumbnail } = rawDataset;

    if (!id || typeof id !== 'string') {
      return { valid: false, error: 'Missing required "id" (string).' };
    }

    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Missing required "name" (string).' };
    }

    if (!mediaType || typeof mediaType !== 'string') {
      return { valid: false, error: 'Missing required "mediaType" (string).' };
    }

    if (!MEDIA_TYPES.has(mediaType)) {
      return {
        valid: false,
        error: `Unsupported mediaType "${mediaType}". Expected one of: ${Array.from(MEDIA_TYPES).join(', ')}.`
      };
    }

    if (!sourceUri || typeof sourceUri !== 'string') {
      return { valid: false, error: 'Missing required "sourceUri" (string).' };
    }

    if (format && typeof format !== 'string') {
      return { valid: false, error: 'Optional "format" must be a string if provided.' };
    }

    if (description && typeof description !== 'string') {
      return { valid: false, error: 'Optional "description" must be a string if provided.' };
    }

    if (thumbnail && typeof thumbnail !== 'string') {
      return { valid: false, error: 'Optional "thumbnail" must be a string if provided.' };
    }

    return {
      valid: true,
      dataset: {
        id,
        name,
        mediaType,
        format: format || null,
        sourceUri,
        description: description || '',
        thumbnail: thumbnail || null
      }
    };
  }

  _cloneCache() {
    if (!this.cache) {
      return { datasets: [], errors: [], lastUpdated: null, catalogDir: this.catalogDir };
    }

    return JSON.parse(JSON.stringify(this.cache));
  }
}

module.exports = new CatalogManager();
